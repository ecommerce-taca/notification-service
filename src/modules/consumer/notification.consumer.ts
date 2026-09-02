import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config';
import { AppLogger } from '../../common/logging/app.logger';
import { RequestContext } from '../../common/http/request-context';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { hashRecipient } from '../../common/security/recipient-masking';
import { encryptRecipient } from '../../common/security/recipient-crypto';
import { Notification } from '../../domain/entities/notification.entity';
import { ProcessedEvent, ProcessedEventStatus } from '../../domain/entities/processed-event.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationCategory } from '../../domain/enums/category.enum';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';
import { ReadStatus } from '../../domain/enums/read-status.enum';
import { ReferenceType } from '../../domain/enums/reference-type.enum';
import { Clock } from '../../domain/ports/clock.port';
import { IdGenerator } from '../../domain/ports/id-generator.port';
import { ProcessedEventRepositoryPort } from '../../domain/ports/processed-event.repository.port';
import { DeliveryService } from '../delivery/delivery.service';
import { NotificationService } from '../notification/notification.service';
import { TemplateService } from '../template/template.service';
import {
  COMMAND_CATEGORY,
  DOMAIN_EVENT_MAP,
  DomainEvent,
  extractRecipient,
  extractReferenceId,
  NotificationCommand,
} from './contracts';

const LOCALE = 'vi-VN';

export interface MessageMeta {
  requestId?: string;
  traceId?: string;
}

interface IngestSpec {
  recipientUserId: string;
  recipient: string | null;
  channel: Channel;
  templateKey: string;
  templateVersion: number;
  dedupeKey: string;
  sourceEventId: string;
  category: NotificationCategory;
  referenceType: ReferenceType | null;
  referenceId: string | null;
  data: Record<string, unknown>;
}

@Injectable()
export class NotificationConsumer {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly processedEventRepository: ProcessedEventRepositoryPort,
    private readonly templateService: TemplateService,
    private readonly deliveryService: DeliveryService,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
  ) {}

  async handleCommand(command: NotificationCommand, meta: MessageMeta): Promise<void> {
    await this.runWithMeta(meta, async () => {
      if (await this.processedEventRepository.existsByEventId(command.event_id)) return;

      const template = await this.templateService.resolveByKey(command.template, LOCALE);
      const category = COMMAND_CATEGORY[command.command_type];
      const data = this.templateService.pickAllowedFields(template, command.data);

      const result = await this.ingest({
        recipientUserId: command.user_id,
        recipient: command.recipient || null,
        channel: command.channel,
        templateKey: template.key,
        templateVersion: template.version,
        dedupeKey: command.dedupe_key,
        sourceEventId: command.event_id,
        category,
        referenceType: null,
        referenceId: null,
        data,
      });

      await this.markProcessed(command.event_id, command.dedupe_key);
      this.dispatchAsync(result.created ? [result.notification.id] : []);
    });
  }

  async handleDomainEvent(event: DomainEvent, meta: MessageMeta): Promise<void> {
    await this.runWithMeta(meta, async () => {
      if (await this.processedEventRepository.existsByEventId(event.event_id)) return;

      const mapping = DOMAIN_EVENT_MAP[event.event_type];
      if (!mapping) {
        this.logger.debug('ignoring unmapped domain event', {
          event: 'event.ignored',
          eventType: event.event_type,
          eventId: event.event_id,
        });
        await this.markProcessed(event.event_id, event.event_id);
        return;
      }

      const template = await this.templateService.resolveByKey(mapping.template, LOCALE);
      const recipient = extractRecipient(event.payload);
      if (!recipient.userId) {
        throw new AppException(ErrorCode.NOTIFICATION_INVALID_INPUT, {
          context: { eventType: event.event_type, eventId: event.event_id },
        });
      }

      const data = this.templateService.pickAllowedFields(template, event.payload);
      const referenceId = extractReferenceId(event.payload, mapping.referenceKey) ?? (event.aggregate_id ?? null);

      const createdIds: string[] = [];
      for (const channel of mapping.channels) {
        const result = await this.ingest({
          recipientUserId: recipient.userId,
          recipient: channel === Channel.EMAIL ? recipient.email : null,
          channel,
          templateKey: template.key,
          templateVersion: template.version,
          dedupeKey: event.event_id,
          sourceEventId: event.event_id,
          category: mapping.category,
          referenceType: mapping.referenceType,
          referenceId,
          data,
        });
        if (result.created) createdIds.push(result.notification.id);
      }

      await this.markProcessed(event.event_id, event.event_id);
      this.dispatchAsync(createdIds);
    });
  }

  private async ingest(spec: IngestSpec): Promise<{ notification: Notification; created: boolean }> {
    const existing = await this.notificationService.findByDedupeKey(spec.recipientUserId, spec.dedupeKey, spec.channel);
    if (existing) {
      if (existing.sourceEventId === spec.sourceEventId) {
        return { notification: existing, created: false };
      }
      throw new AppException(ErrorCode.NOTIFICATION_IDEMPOTENCY_CONFLICT, {
        context: { dedupeKey: spec.dedupeKey, channel: spec.channel },
      });
    }

    const notification = new Notification();
    notification.id = this.idGenerator.generate();
    notification.recipientUserId = spec.recipientUserId;
    notification.recipientEncrypted = spec.recipient
      ? encryptRecipient(spec.recipient, this.config.config.recipientEncryptionSecret)
      : null;
    notification.recipientHash = spec.recipient
      ? hashRecipient(spec.recipient, this.config.config.recipientHashSecret)
      : null;
    notification.channel = spec.channel;
    notification.templateKey = spec.templateKey;
    notification.templateVersion = spec.templateVersion;
    notification.dedupeKey = spec.dedupeKey;
    notification.sourceEventId = spec.sourceEventId;
    notification.category = spec.category;
    notification.referenceType = spec.referenceType;
    notification.referenceId = spec.referenceId;
    notification.data = spec.data;
    notification.status = NotificationStatus.QUEUED;
    notification.readStatus = spec.channel === Channel.IN_APP ? ReadStatus.UNREAD : null;
    notification.scheduledAt = this.clock.now();
    notification.sentAt = null;

    const saved = await this.notificationService.save(notification);
    return { notification: saved, created: true };
  }

  private async markProcessed(eventId: string, dedupeKey: string): Promise<void> {
    const processed = new ProcessedEvent();
    processed.id = this.idGenerator.generate();
    processed.eventId = eventId;
    processed.dedupeKey = dedupeKey;
    processed.processedAt = this.clock.now();
    processed.status = ProcessedEventStatus.PROCESSED;
    processed.error = null;
    await this.processedEventRepository.save(processed);
  }

  // Fire-and-forget: persist xong rồi mới dispatch, không block commit offset.
  private dispatchAsync(notificationIds: string[]): void {
    const context = RequestContext.current();
    const run = async (): Promise<void> => {
      await Promise.all(
        notificationIds.map((id) =>
          this.deliveryService
            .dispatch(id)
            .catch((err) => this.logger.error('dispatch failed', err, { event: 'delivery.error', notificationId: id })),
        ),
      );
    };
    void (context ? RequestContext.run(context, run) : run());
  }

  private async runWithMeta<T>(meta: MessageMeta, fn: () => Promise<T>): Promise<T> {
    return RequestContext.run(
      { requestId: meta.requestId ?? this.idGenerator.generate(), traceId: meta.traceId },
      fn,
    );
  }
}
