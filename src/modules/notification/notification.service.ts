import { Injectable } from '@nestjs/common';
import { Notification } from '../../domain/entities/notification.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';
import {
  DeliveryQuery,
  NotificationListQuery,
  NotificationPagedResult,
  NotificationRepositoryPort,
  NotificationStatusPatch,
} from '../../domain/ports/notification.repository.port';

// Duy nhất service này chạm NotificationRepositoryPort. Các service khác (consumer, delivery,
// admin, in-app) chỉ gọi qua đây — đổi repository bên dưới không lan ra ngoài module.
@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepositoryPort) {}

  save(notification: Notification): Promise<Notification> {
    return this.notificationRepository.save(notification);
  }

  findByDedupeKey(recipientUserId: string, dedupeKey: string, channel: Channel): Promise<Notification | null> {
    return this.notificationRepository.findByDedupeKey(recipientUserId, dedupeKey, channel);
  }

  findById(id: string): Promise<Notification | null> {
    return this.notificationRepository.findById(id);
  }

  findByIdAndRecipient(id: string, recipientUserId: string): Promise<Notification | null> {
    return this.notificationRepository.findByIdAndRecipient(id, recipientUserId);
  }

  findPaged(query: NotificationListQuery): Promise<NotificationPagedResult> {
    return this.notificationRepository.findPaged(query);
  }

  countUnread(recipientUserId: string): Promise<number> {
    return this.notificationRepository.countUnread(recipientUserId);
  }

  markRead(id: string, recipientUserId: string): Promise<void> {
    return this.notificationRepository.markRead(id, recipientUserId);
  }

  markAllRead(recipientUserId: string, before: Date | null): Promise<number> {
    return this.notificationRepository.markAllRead(recipientUserId, before);
  }

  updateStatus(id: string, status: NotificationStatus, patch?: NotificationStatusPatch): Promise<void> {
    return this.notificationRepository.updateStatus(id, status, patch);
  }

  findPendingDelivery(staleBefore: Date, limit: number): Promise<Notification[]> {
    return this.notificationRepository.findPendingDelivery(staleBefore, limit);
  }

  findDeliveries(query: DeliveryQuery): Promise<NotificationPagedResult> {
    return this.notificationRepository.findDeliveries(query);
  }
}

// Re-export type dùng chung để service ngoài không cần import từ port file.
export type { ReadStatusFilter } from '../../domain/ports/notification.repository.port';
