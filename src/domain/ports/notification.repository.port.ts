import { Channel } from '../enums/channel.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { ReadStatus } from '../enums/read-status.enum';
import { NotificationCategory } from '../enums/category.enum';
import { Notification } from '../entities/notification.entity';

export type ReadStatusFilter = 'ALL' | 'READ' | 'UNREAD';

export interface NotificationListQuery {
  recipientUserId: string;
  page: number;
  size: number;
  readStatus?: ReadStatusFilter;
  category?: NotificationCategory;
}

export interface NotificationPagedResult {
  items: Notification[];
  total: number;
}

export interface DeliveryQuery {
  status?: NotificationStatus;
  channel?: Channel;
  template?: string;
  from?: Date;
  to?: Date;
  recipientHash?: string;
  page: number;
  size: number;
}

export interface NotificationStatusPatch {
  sentAt?: Date | null;
  readStatus?: ReadStatus | null;
}

export abstract class NotificationRepositoryPort {
  abstract save(notification: Notification): Promise<Notification>;
  abstract findById(id: string): Promise<Notification | null>;
  abstract findByIdAndRecipient(id: string, recipientUserId: string): Promise<Notification | null>;
  abstract findByDedupeKey(recipientUserId: string, dedupeKey: string, channel: Channel): Promise<Notification | null>;
  abstract findPaged(query: NotificationListQuery): Promise<NotificationPagedResult>;
  abstract countUnread(recipientUserId: string): Promise<number>;
  abstract markRead(id: string, recipientUserId: string): Promise<void>;
  abstract markAllRead(recipientUserId: string, before: Date | null): Promise<number>;
  abstract updateStatus(id: string, status: NotificationStatus, patch?: NotificationStatusPatch): Promise<void>;
  abstract findPendingDelivery(staleBefore: Date, limit: number): Promise<Notification[]>;
  abstract findDeliveries(query: DeliveryQuery): Promise<NotificationPagedResult>;
}
