import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { DeliveryStatusEvent } from '../ports/event-publisher.port';

// Outbox cho delivery status: ghi cùng transaction với việc đổi trạng thái notification,
// relay worker publish sau — tránh mất event khi crash giữa persist và publish.
@Entity('delivery_outbox')
@Index('idx_delivery_outbox_pending', ['publishedAt', 'createdAt'])
export class DeliveryOutbox {
  @PrimaryColumn({ name: '_id', type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'aggregate_id', type: 'varchar', length: 36 })
  aggregateId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType: string;

  @Column({ type: 'json' })
  payload: DeliveryStatusEvent;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @Column({ name: 'published_at', type: 'datetime', precision: 6, nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;
}
