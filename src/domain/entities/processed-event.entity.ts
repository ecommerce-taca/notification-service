import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export enum ProcessedEventStatus {
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

@Entity('processed_events')
export class ProcessedEvent {
  @PrimaryColumn({ name: '_id', type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'event_id', type: 'varchar', length: 64, unique: true })
  eventId: string;

  @Column({ name: 'dedupe_key', type: 'varchar', length: 255, unique: true })
  dedupeKey: string;

  @Column({ name: 'processed_at', type: 'datetime', precision: 6 })
  @Index('idx_processed_events_processed_at')
  processedAt: Date;

  @Column({ type: 'enum', enum: ProcessedEventStatus })
  status: ProcessedEventStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  error: string | null;
}
