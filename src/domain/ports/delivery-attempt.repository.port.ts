import { DeliveryAttempt } from '../entities/delivery-attempt.entity';

export abstract class DeliveryAttemptRepositoryPort {
  abstract save(attempt: DeliveryAttempt): Promise<DeliveryAttempt>;
  abstract findByNotification(notificationId: string): Promise<DeliveryAttempt[]>;
  abstract findByNotificationIds(notificationIds: string[]): Promise<DeliveryAttempt[]>;
  abstract countByNotification(notificationId: string): Promise<number>;
  // attempt_no gần nhất (0 nếu chưa có attempt) — để attempt sequence tăng đơn điệu qua các lần dispatch.
  abstract findLastAttemptNo(notificationId: string): Promise<number>;
}
