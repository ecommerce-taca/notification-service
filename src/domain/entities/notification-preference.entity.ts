import { Column, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Entity } from 'typeorm';
import { Channel } from '../enums/channel.enum';
import { NotificationCategory } from '../enums/category.enum';
import { PreferenceStatus } from '../enums/preference-status.enum';

// `locked` không có trong db doc §3.3 nhưng API §3.3 trả `locked` và seed §6.2 dùng `locked=true`
// cho category SECURITY — bổ sung cột boolean để đáp ứng contract (xem báo cáo).
@Entity('notification_preferences')
@Index('uq_preferences_user_channel_category', ['userId', 'channel', 'category'], { unique: true })
export class NotificationPreference {
  @PrimaryColumn({ name: '_id', type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'enum', enum: Channel })
  channel: Channel;

  @Column({ type: 'enum', enum: NotificationCategory })
  category: NotificationCategory;

  @Column({ type: 'enum', enum: PreferenceStatus })
  status: PreferenceStatus;

  @Column({ type: 'boolean', default: false })
  locked: boolean;

  @Column({ type: 'int', default: 1 })
  version: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
