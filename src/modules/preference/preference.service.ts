import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationCategory } from '../../domain/enums/category.enum';
import { PreferenceStatus } from '../../domain/enums/preference-status.enum';
import { Clock } from '../../domain/ports/clock.port';
import { IdGenerator } from '../../domain/ports/id-generator.port';
import { PreferenceRepositoryPort } from '../../domain/ports/preference.repository.port';

@Injectable()
export class PreferenceService {
  constructor(
    private readonly preferenceRepository: PreferenceRepositoryPort,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async list(userId: string): Promise<NotificationPreference[]> {
    return this.preferenceRepository.findByUser(userId);
  }

  async update(
    userId: string,
    channel: Channel,
    category: NotificationCategory,
    status: PreferenceStatus,
  ): Promise<NotificationPreference> {
    if (status === PreferenceStatus.DISABLED && this.isLockedCategory(category)) {
      throw new AppException(ErrorCode.NOTIFICATION_PREFERENCE_LOCKED);
    }

    const existing = await this.preferenceRepository.findOne(userId, channel, category);
    if (existing) {
      if (status === PreferenceStatus.DISABLED && existing.locked) {
        throw new AppException(ErrorCode.NOTIFICATION_PREFERENCE_LOCKED);
      }
      existing.status = status;
      existing.version += 1;
      return this.preferenceRepository.save(existing);
    }

    const preference = new NotificationPreference();
    preference.id = this.idGenerator.generate();
    preference.userId = userId;
    preference.channel = channel;
    preference.category = category;
    preference.status = status;
    preference.locked = this.isLockedCategory(category);
    preference.version = 1;
    preference.updatedAt = this.clock.now();
    return this.preferenceRepository.save(preference);
  }

  // Trả về true nếu channel+category này bị user tắt (không có row = mặc định bật).
  async isDisabled(userId: string, channel: Channel, category: NotificationCategory): Promise<boolean> {
    const preference = await this.preferenceRepository.findOne(userId, channel, category);
    if (!preference) return false;
    return preference.status === PreferenceStatus.DISABLED;
  }

  isLockedCategory(category: NotificationCategory): boolean {
    return category === NotificationCategory.SECURITY;
  }
}
