import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { AttemptStatus } from '../enums/attempt-status.enum';

@Entity('delivery_attempts')
@Index('idx_attempts_notification_no', ['notificationId', 'attemptNo'])
@Index('idx_attempts_status_started', ['status', 'startedAt'])
export class DeliveryAttempt {
  @PrimaryColumn({ name: '_id', type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'notification_id', type: 'varchar', length: 36 })
  notificationId: string;

  @Column({ name: 'attempt_no', type: 'int' })
  attemptNo: number;

  @Column({ type: 'varchar', length: 32 })
  provider: string;

  @Column({ type: 'enum', enum: AttemptStatus })
  status: AttemptStatus;

  // provider message id đã mask — không lưu id thô
  @Column({ name: 'provider_message_id', type: 'varchar', length: 255, nullable: true })
  providerMessageId: string | null;

  @Column({ name: 'error_code', type: 'varchar', length: 64, nullable: true })
  errorCode: string | null;

  @Column({ name: 'started_at', type: 'datetime', precision: 6, nullable: true })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'datetime', precision: 6, nullable: true })
  finishedAt: Date | null;

  @Column({ name: 'trace_id', type: 'varchar', length: 64, nullable: true })
  traceId: string | null;

  @Column({ name: 'request_id', type: 'varchar', length: 64, nullable: true })
  requestId: string | null;
}
