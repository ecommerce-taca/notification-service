import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config';
import { decryptRecipient } from '../../common/security/recipient-crypto';
import { maskRecipient } from '../../common/security/recipient-masking';
import { DeliveryAttempt } from '../../domain/entities/delivery-attempt.entity';
import { Notification } from '../../domain/entities/notification.entity';
import { AttemptStatus } from '../../domain/enums/attempt-status.enum';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';
import { DeliveryAttemptRepositoryPort } from '../../domain/ports/delivery-attempt.repository.port';
import { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import { AdminDeliveryResponse } from '../in-app/dto/response.dto';

function providerStatusFromAttempt(attempt: DeliveryAttempt | undefined): string | null {
  if (!attempt) return null;
  switch (attempt.status) {
    case AttemptStatus.SENT:
      return 'delivered';
    case AttemptStatus.RETRYABLE_FAILED:
      return 'temporary_failure';
    case AttemptStatus.PERMANENT_FAILED:
      return 'bounced';
    default:
      return 'sending';
  }
}

function toAdminDeliveryResponse(
  notification: Notification,
  attempts: DeliveryAttempt[],
  recipientPlain: string | null,
): AdminDeliveryResponse {
  const latest = attempts[attempts.length - 1];
  return {
    notification_id: notification.id,
    channel: notification.channel,
    template: notification.templateKey,
    status: notification.status,
    attempt_count: attempts.length,
    recipient_masked: recipientPlain ? maskRecipient(recipientPlain) : null,
    provider_status: providerStatusFromAttempt(latest),
    error_code: latest?.errorCode ?? null,
    queued_at: (notification.scheduledAt ?? notification.createdAt).toISOString(),
    sent_at: notification.sentAt?.toISOString() ?? null,
  };
}

export interface ListDeliveriesQuery {
  page: number;
  size: number;
  status?: NotificationStatus;
  channel?: Channel;
  template?: string;
  recipientHash?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly deliveryAttemptRepository: DeliveryAttemptRepositoryPort,
    private readonly config: AppConfigService,
  ) {}

  async listDeliveries(query: ListDeliveriesQuery): Promise<{ items: AdminDeliveryResponse[]; total: number }> {
    const { items, total } = await this.notificationRepository.findDeliveries({
      page: query.page,
      size: query.size,
      status: query.status,
      channel: query.channel,
      template: query.template,
      recipientHash: query.recipientHash,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    const attempts = await this.deliveryAttemptRepository.findByNotificationIds(
      items.map((notification) => notification.id),
    );
    const attemptsByNotification = new Map<string, DeliveryAttempt[]>();
    for (const attempt of attempts) {
      const list = attemptsByNotification.get(attempt.notificationId) ?? [];
      list.push(attempt);
      attemptsByNotification.set(attempt.notificationId, list);
    }

    const mapped = items.map((notification) => {
      const recipientPlain = notification.recipientEncrypted
        ? decryptRecipient(notification.recipientEncrypted, this.config.config.recipientEncryptionSecret)
        : null;
      return toAdminDeliveryResponse(notification, attemptsByNotification.get(notification.id) ?? [], recipientPlain);
    });
    return { items: mapped, total };
  }
}
