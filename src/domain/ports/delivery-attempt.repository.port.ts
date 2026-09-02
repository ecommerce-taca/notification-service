import { DeliveryAttempt } from '../entities/delivery-attempt.entity';

export abstract class DeliveryAttemptRepositoryPort {
  abstract save(attempt: DeliveryAttempt): Promise<DeliveryAttempt>;
  abstract findByNotification(notificationId: string): Promise<DeliveryAttempt[]>;
  abstract findByNotificationIds(notificationIds: string[]): Promise<DeliveryAttempt[]>;
  abstract countByNotification(notificationId: string): Promise<number>;
}
