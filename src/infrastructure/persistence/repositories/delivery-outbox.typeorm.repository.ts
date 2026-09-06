import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { DeliveryAttempt } from '../../../domain/entities/delivery-attempt.entity';
import { DeliveryOutbox } from '../../../domain/entities/delivery-outbox.entity';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationStatus } from '../../../domain/enums/notification-status.enum';
import { DeliveryOutboxRepositoryPort } from '../../../domain/ports/delivery-outbox.repository.port';
import { DeliveryStatusEvent } from '../../../domain/ports/event-publisher.port';

// Finalize delivery = 1 transaction nguyên tử (status + attempt + outbox). Nếu tách 3 lệnh riêng,
// crash giữa chừng sẽ tạo trạng thái lệch (vd SENT nhưng mất event) — nên phải gộp ở đây.
@Injectable()
export class DeliveryOutboxTypeOrmRepository implements DeliveryOutboxRepositoryPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async recordSent(
    notificationId: string,
    sentAt: Date,
    attempt: DeliveryAttempt,
    event: DeliveryStatusEvent,
  ): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      await em.getRepository(Notification).update(notificationId, {
        status: NotificationStatus.SENT,
        sentAt,
        processingStartedAt: null,
      });
      await em.getRepository(DeliveryAttempt).save(attempt);
      await em.getRepository(DeliveryOutbox).save(this.toEntity(event));
    });
  }

  async recordFailed(
    notificationId: string,
    attempt: DeliveryAttempt,
    event: DeliveryStatusEvent,
  ): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      await em.getRepository(Notification).update(notificationId, {
        status: NotificationStatus.FAILED,
        processingStartedAt: null,
      });
      await em.getRepository(DeliveryAttempt).save(attempt);
      await em.getRepository(DeliveryOutbox).save(this.toEntity(event));
    });
  }

  async findUnpublished(limit: number): Promise<DeliveryOutbox[]> {
    return this.dataSource.getRepository(DeliveryOutbox).find({
      where: { publishedAt: IsNull() },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async markPublished(id: string): Promise<void> {
    await this.dataSource.getRepository(DeliveryOutbox).update(id, { publishedAt: new Date() });
  }

  private toEntity(event: DeliveryStatusEvent): DeliveryOutbox {
    const outbox = new DeliveryOutbox();
    outbox.id = event.eventId;
    outbox.aggregateId = event.notificationId;
    outbox.eventType = `notification.${event.outcome}`;
    outbox.payload = event;
    outbox.retryCount = 0;
    return outbox;
  }
}
