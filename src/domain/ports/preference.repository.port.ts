import { Channel } from '../enums/channel.enum';
import { NotificationCategory } from '../enums/category.enum';
import { NotificationPreference } from '../entities/notification-preference.entity';

export abstract class PreferenceRepositoryPort {
  abstract findByUser(userId: string): Promise<NotificationPreference[]>;
  abstract findOne(userId: string, channel: Channel, category: NotificationCategory): Promise<NotificationPreference | null>;
  abstract save(preference: NotificationPreference): Promise<NotificationPreference>;
}
