import { Channel } from '../enums/channel.enum';

export type DeliveryOutcome = 'delivered' | 'failed';

export interface DeliveryStatusEvent {
  eventId: string;
  outcome: DeliveryOutcome;
  dedupeKey: string;
  notificationId: string;
  channel: Channel;
  templateKey: string;
  errorCode: string | null;
  occurredAt: string;
}

// Notification phát kết quả delivery async (notification.delivered.v1 / notification.failed.v1).
export abstract class EventPublisherPort {
  abstract publishDeliveryStatus(event: DeliveryStatusEvent): Promise<void>;
}
