import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Channel } from '../enums/channel.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { ReadStatus } from '../enums/read-status.enum';
import { NotificationCategory } from '../enums/category.enum';
import { ReferenceType } from '../enums/reference-type.enum';

// Lưu ý: db doc §3.1 không liệt kê category/reference_type/reference_id/recipient_encrypted/recipient_hash,
// nhưng API §3.1 bắt buộc trả category + reference (deep-link/filter), và recipient cần để gửi + hiển thị
// masked ở admin. Các cột bổ sung này cần thiết cho contract API (xem báo cáo).
@Entity('notifications')
@Index('uq_notifications_recipient_dedupe_channel', ['recipientUserId', 'dedupeKey', 'channel'], { unique: true })
@Index('idx_notifications_recipient_created', ['recipientUserId', 'createdAt'])
@Index('idx_notifications_recipient_read_created', ['recipientUserId', 'readStatus', 'createdAt'])
@Index('idx_notifications_status_scheduled', ['status', 'scheduledAt'])
@Index('idx_notifications_recipient_hash', ['recipientHash'])
export class Notification {
  @PrimaryColumn({ name: '_id', type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'recipient_user_id', type: 'varchar', length: 36 })
  recipientUserId: string;

  // Recipient (email/phone) mã hoá AES-256-GCM — không lưu plaintext; decrypt lúc gửi/hiển thị.
  @Column({ name: 'recipient_encrypted', type: 'text', nullable: true })
  recipientEncrypted: string | null;

  // HMAC-SHA256 của recipient (filter admin theo recipient_hash, không lộ thô).
  @Column({ name: 'recipient_hash', type: 'char', length: 64, nullable: true })
  recipientHash: string | null;

  @Column({ type: 'enum', enum: Channel })
  channel: Channel;

  @Column({ name: 'template_key', type: 'varchar', length: 100 })
  templateKey: string;

  @Column({ name: 'template_version', type: 'int' })
  templateVersion: number;

  @Column({ name: 'dedupe_key', type: 'varchar', length: 255 })
  dedupeKey: string;

  @Column({ name: 'source_event_id', type: 'varchar', length: 64, nullable: true })
  sourceEventId: string | null;

  @Column({ type: 'enum', enum: NotificationCategory })
  category: NotificationCategory;

  @Column({ name: 'reference_type', type: 'enum', enum: ReferenceType, nullable: true })
  referenceType: ReferenceType | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 64, nullable: true })
  referenceId: string | null;

  @Column({ type: 'json', nullable: true })
  data: Record<string, unknown> | null;

  @Column({ type: 'enum', enum: NotificationStatus })
  status: NotificationStatus;

  @Column({ name: 'read_status', type: 'enum', enum: ReadStatus, nullable: true })
  readStatus: ReadStatus | null;

  @Column({ name: 'scheduled_at', type: 'datetime', precision: 6, nullable: true })
  scheduledAt: Date | null;

  // Lease xử lý: đặt khi worker claim PROCESSING; sweeper chỉ reclaim khi lease đã quá staleBefore.
  @Column({ name: 'processing_started_at', type: 'datetime', precision: 6, nullable: true })
  processingStartedAt: Date | null;

  @Column({ name: 'sent_at', type: 'datetime', precision: 6, nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
