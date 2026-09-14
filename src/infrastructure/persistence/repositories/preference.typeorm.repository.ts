import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../../../domain/entities/notification-preference.entity';
import { Channel } from '../../../domain/enums/channel.enum';
import { NotificationCategory } from '../../../domain/enums/category.enum';
import { PreferenceRepositoryPort } from '../../../domain/ports/preference.repository.port';

@Injectable()
export class PreferenceTypeOrmRepository implements PreferenceRepositoryPort {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly repo: Repository<NotificationPreference>,
  ) {}

  async findByUser(userId: string): Promise<NotificationPreference[]> {
    return this.repo.find({ where: { userId }, order: { category: 'ASC', channel: 'ASC' } });
  }

  async findOne(userId: string, channel: Channel, category: NotificationCategory): Promise<NotificationPreference | null> {
    return this.repo.findOne({ where: { userId, channel, category } });
  }

  async save(preference: NotificationPreference): Promise<NotificationPreference> {
    return this.repo.save(preference);
  }
}
