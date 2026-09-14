import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('notification_audits')
@Index('idx_audits_target_occurred', ['targetId', 'occurredAt'])
@Index('idx_audits_actor_occurred', ['actorUserId', 'occurredAt'])
export class NotificationAudit {
  @PrimaryColumn({ name: '_id', type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'actor_user_id', type: 'varchar', length: 36, nullable: true })
  actorUserId: string | null;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ name: 'target_type', type: 'varchar', length: 32 })
  targetType: string;

  @Column({ name: 'target_id', type: 'varchar', length: 64 })
  targetId: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  reason: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'occurred_at', type: 'datetime', precision: 6 })
  occurredAt: Date;
}
