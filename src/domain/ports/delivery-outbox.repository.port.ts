import { DeliveryAttempt } from '../entities/delivery-attempt.entity';
import { DeliveryOutbox } from '../entities/delivery-outbox.entity';
import { DeliveryStatusEvent } from './event-publisher.port';

// Persistence cho delivery finalize: ghi nguyên tử (notification status + delivery attempt +
// outbox event) trong 1 transaction, để relay worker publish sau mà không mất event.
export abstract class DeliveryOutboxRepositoryPort {
  abstract recordSent(
    notificationId: string,
    sentAt: Date,
    attempt: DeliveryAttempt,
    event: DeliveryStatusEvent,
  ): Promise<void>;

  abstract recordFailed(
    notificationId: string,
    attempt: DeliveryAttempt,
    event: DeliveryStatusEvent,
  ): Promise<void>;

  abstract findUnpublished(limit: number): Promise<DeliveryOutbox[]>;
  abstract markPublished(id: string): Promise<void>;
}
