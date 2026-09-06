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
// Throw khi publish thất bại — để outbox relay biết chưa publish được mà giữ lại retry sau.
export abstract class EventPublisherPort {
  abstract publishDeliveryStatus(event: DeliveryStatusEvent): Promise<void>;
}
