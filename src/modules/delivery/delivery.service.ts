import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config';
import { AppLogger } from '../../common/logging/app.logger';
import { RequestContext } from '../../common/http/request-context';
import { DeliveryAttempt } from '../../domain/entities/delivery-attempt.entity';
import { Notification } from '../../domain/entities/notification.entity';
import { AttemptStatus } from '../../domain/enums/attempt-status.enum';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';
import { Clock } from '../../domain/ports/clock.port';
import { DeliveryAttemptRepositoryPort } from '../../domain/ports/delivery-attempt.repository.port';
import { DeliveryOutboxRepositoryPort } from '../../domain/ports/delivery-outbox.repository.port';
import { DeliveryStatusEvent } from '../../domain/ports/event-publisher.port';
import { IdGenerator } from '../../domain/ports/id-generator.port';
import { DeliverySendError, DispatchResult, DispatcherService } from '../dispatcher/dispatcher.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly dispatcher: DispatcherService,
    private readonly notificationService: NotificationService,
    private readonly deliveryAttemptRepository: DeliveryAttemptRepositoryPort,
    private readonly deliveryOutboxRepository: DeliveryOutboxRepositoryPort,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
  ) {}

  async dispatch(notificationId: string): Promise<void> {
    const staleBefore = new Date(this.clock.now().getTime() - this.config.config.delivery.staleAfterMs);

    // Atomic claim chống race: nhiều worker claim cùng notification chỉ 1 thắng (#3/#4/#5).
    const claimed = await this.notificationService.tryClaimProcessing(notificationId, staleBefore);
    if (!claimed) return;

    const notification = await this.notificationService.findById(notificationId);
    if (!notification) return;

    const maxAttempts = this.config.config.delivery.maxAttempts;
    // attempt_no đơn điệu qua các lần dispatch/reclaim (#6).
    let attemptNo = (await this.deliveryAttemptRepository.findLastAttemptNo(notificationId)) + 1;

    for (; attemptNo <= maxAttempts; attemptNo++) {
      const startedAt = this.clock.now();

      // Error boundary của provider tách riêng: lỗi DB/outbox phía dưới không lọt vào đây (#1).
      let result: DispatchResult;
      try {
        result = await this.dispatcher.dispatch(notification);
      } catch (err) {
        if (err instanceof DeliverySendError) {
          if (err.retryable && attemptNo < maxAttempts) {
            await this.saveAttempt(
              notification, attemptNo, AttemptStatus.RETRYABLE_FAILED, err.provider, null, err.errorCode, startedAt,
            );
            await this.sleep(this.backoffMs(attemptNo));
            continue;
          }
          const status = err.retryable ? AttemptStatus.RETRY_EXHAUSTED : AttemptStatus.PERMANENT_FAILED;
          await this.finalizeFailed(notification, attemptNo, status, err.provider, err.errorCode, startedAt);
          return;
        }
        // Lỗi ngoài dự kiến (template/validate) — không retry vô ích.
        this.logger.error('delivery failed unexpectedly', err, { event: 'delivery.error', notificationId });
        await this.finalizeFailed(
          notification, attemptNo, AttemptStatus.PERMANENT_FAILED,
          this.dispatcher.providerFor(notification.channel), 'INTERNAL_ERROR', startedAt,
        );
        return;
      }

      // Provider đã xử lý xong (sent/skipped). Từ đây lỗi DB KHÔNG được flip FAILED (#1/#2).
      if (result.outcome === 'skipped') {
        // Ưu tiên chốt terminal SKIPPED trước để không bị reclaim lại, rồi mới ghi attempt.
        await this.notificationService.updateStatus(notificationId, NotificationStatus.SKIPPED);
        await this.saveAttempt(notification, attemptNo, AttemptStatus.SKIPPED, result.provider, null, null, startedAt);
        return;
      }

      await this.finalizeSent(notification, attemptNo, result, startedAt);
      return;
    }
  }

  private async finalizeSent(
    notification: Notification,
    attemptNo: number,
    result: DispatchResult,
    startedAt: Date,
  ): Promise<void> {
    const attempt = this.buildAttempt(notification, attemptNo, AttemptStatus.SENT, result.provider, result.providerMessageId, null, startedAt);
    const event = this.buildEvent(notification, 'delivered', null);
    try {
      await this.deliveryOutboxRepository.recordSent(notification.id, this.clock.now(), attempt, event);
    } catch (err) {
      // Provider đã gửi thành công; lỗi DB ở đây KHÔNG được chuyển FAILED (#1/#2). Notification giữ
      // PROCESSING, lease hết hạn sẽ reclaim → gửi lại (at-least-once, đúng doc).
      this.logger.error('delivery sent but finalize failed', err, { event: 'delivery.finalize_failed', notificationId: notification.id });
    }
  }

  private async finalizeFailed(
    notification: Notification,
    attemptNo: number,
    status: AttemptStatus,
    provider: string,
    errorCode: string,
    startedAt: Date,
  ): Promise<void> {
    const attempt = this.buildAttempt(notification, attemptNo, status, provider, null, errorCode, startedAt);
    const event = this.buildEvent(notification, 'failed', errorCode);
    try {
      await this.deliveryOutboxRepository.recordFailed(notification.id, attempt, event);
    } catch (err) {
      this.logger.error('delivery failed but finalize failed', err, { event: 'delivery.finalize_failed', notificationId: notification.id });
    }
  }

  private async saveAttempt(
    notification: Notification,
    attemptNo: number,
    status: AttemptStatus,
    provider: string,
    providerMessageId: string | null,
    errorCode: string | null,
    startedAt: Date,
  ): Promise<void> {
    await this.deliveryAttemptRepository.save(
      this.buildAttempt(notification, attemptNo, status, provider, providerMessageId, errorCode, startedAt),
    );
  }

  private buildAttempt(
    notification: Notification,
    attemptNo: number,
    status: AttemptStatus,
    provider: string,
    providerMessageId: string | null,
    errorCode: string | null,
    startedAt: Date,
  ): DeliveryAttempt {
    const attempt = new DeliveryAttempt();
    attempt.id = this.idGenerator.generate();
    attempt.notificationId = notification.id;
    attempt.attemptNo = attemptNo;
    attempt.provider = provider;
    attempt.status = status;
    attempt.providerMessageId = providerMessageId;
    attempt.errorCode = errorCode;
    attempt.startedAt = startedAt;
    attempt.finishedAt = this.clock.now();
    attempt.traceId = RequestContext.getTraceId() ?? null;
    attempt.requestId = RequestContext.getRequestId() ?? null;
    return attempt;
  }

  private buildEvent(
    notification: Notification,
    outcome: 'delivered' | 'failed',
    errorCode: string | null,
  ): DeliveryStatusEvent {
    return {
      eventId: this.idGenerator.generate(),
      outcome,
      dedupeKey: notification.dedupeKey,
      notificationId: notification.id,
      channel: notification.channel,
      templateKey: notification.templateKey,
      errorCode,
      occurredAt: this.clock.now().toISOString(),
    };
  }

  // Admin cần attempt theo danh sách notification để dựng view deliveries; read duy nhất ngoài service.
  async findAttemptsByNotificationIds(notificationIds: string[]): Promise<DeliveryAttempt[]> {
    return this.deliveryAttemptRepository.findByNotificationIds(notificationIds);
  }

  // Exponential backoff + jitter để tránh thundering herd khi provider outage (#11).
  private backoffMs(attemptNo: number): number {
    const base = this.config.config.delivery.backoffMs;
    const exponential = Math.min(base * Math.pow(2, attemptNo - 1), 30_000);
    const jitter = Math.floor(Math.random() * base);
    return exponential + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
