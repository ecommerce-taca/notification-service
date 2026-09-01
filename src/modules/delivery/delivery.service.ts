import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config';
import { AppLogger } from '../../common/logging/app.logger';
import { RequestContext } from '../../common/http/request-context';
import { DeliveryAttempt } from '../../domain/entities/delivery-attempt.entity';
import { Notification } from '../../domain/entities/notification.entity';
import { AttemptStatus } from '../../domain/enums/attempt-status.enum';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';
import { Clock } from '../../domain/ports/clock.port';
import { DeliveryAttemptRepositoryPort } from '../../domain/ports/delivery-attempt.repository.port';
import { DeliveryOutcome, EventPublisherPort } from '../../domain/ports/event-publisher.port';
import { IdGenerator } from '../../domain/ports/id-generator.port';
import { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import { DeliverySendError, DispatcherService } from '../dispatcher/dispatcher.service';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly dispatcher: DispatcherService,
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly deliveryAttemptRepository: DeliveryAttemptRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
  ) {}

  async dispatch(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) return;
    if (notification.status === NotificationStatus.SENT || notification.status === NotificationStatus.SKIPPED) {
      return;
    }

    await this.notificationRepository.updateStatus(notificationId, NotificationStatus.PROCESSING);

    const maxAttempts = this.config.config.delivery.retryCount;
    for (let attemptNo = 1; attemptNo <= maxAttempts; attemptNo++) {
      const attemptStartedAt = this.clock.now();
      try {
        const outcome = await this.dispatcher.dispatch(notification);
        await this.recordAttempt(notification, attemptNo, AttemptStatus.SENT, null, attemptStartedAt);

        if (outcome === 'skipped') {
          await this.notificationRepository.updateStatus(notificationId, NotificationStatus.SKIPPED);
          return;
        }

        await this.notificationRepository.updateStatus(notificationId, NotificationStatus.SENT, {
          sentAt: this.clock.now(),
        });
        await this.publishDeliveryStatus(notification, 'delivered', null);
        return;
      } catch (err) {
        if (err instanceof DeliverySendError) {
          const isLastAttempt = attemptNo === maxAttempts;
          if (err.retryable && !isLastAttempt) {
            await this.recordAttempt(notification, attemptNo, AttemptStatus.RETRYABLE_FAILED, err.errorCode, attemptStartedAt);
            await this.sleep(this.config.config.delivery.backoffMs);
            continue;
          }
          await this.recordAttempt(notification, attemptNo, AttemptStatus.PERMANENT_FAILED, err.errorCode, attemptStartedAt);
          await this.fail(notification, err.errorCode);
          return;
        }

        // Lỗi ngoài dự kiến (DB/template/validate) — không retry vô ích.
        this.logger.error('delivery failed unexpectedly', err, { event: 'delivery.error', notificationId });
        await this.recordAttempt(notification, attemptNo, AttemptStatus.PERMANENT_FAILED, 'INTERNAL_ERROR', attemptStartedAt);
        await this.fail(notification, 'INTERNAL_ERROR');
        return;
      }
    }
  }

  private async fail(notification: Notification, errorCode: string): Promise<void> {
    await this.notificationRepository.updateStatus(notification.id, NotificationStatus.FAILED);
    await this.publishDeliveryStatus(notification, 'failed', errorCode);
  }

  private async publishDeliveryStatus(
    notification: Notification,
    outcome: DeliveryOutcome,
    errorCode: string | null,
  ): Promise<void> {
    await this.eventPublisher.publishDeliveryStatus({
      eventId: this.idGenerator.generate(),
      outcome,
      dedupeKey: notification.dedupeKey,
      notificationId: notification.id,
      channel: notification.channel,
      templateKey: notification.templateKey,
      errorCode,
      occurredAt: this.clock.now().toISOString(),
    });
  }

  private async recordAttempt(
    notification: Notification,
    attemptNo: number,
    status: AttemptStatus,
    errorCode: string | null,
    startedAt: Date,
  ): Promise<void> {
    const attempt = new DeliveryAttempt();
    attempt.id = this.idGenerator.generate();
    attempt.notificationId = notification.id;
    attempt.attemptNo = attemptNo;
    attempt.provider = this.providerFor(notification.channel);
    attempt.status = status;
    attempt.providerMessageId = null;
    attempt.errorCode = errorCode;
    attempt.startedAt = startedAt;
    attempt.finishedAt = this.clock.now();
    attempt.traceId = RequestContext.getTraceId() ?? null;
    attempt.requestId = RequestContext.getRequestId() ?? null;
    await this.deliveryAttemptRepository.save(attempt);
  }

  private providerFor(channel: Channel): string {
    return channel === Channel.EMAIL ? 'smtp' : 'in_app';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
