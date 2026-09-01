import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationCategory } from '../../domain/enums/category.enum';
import { PreferenceStatus } from '../../domain/enums/preference-status.enum';
import { NotificationRepositoryPort, ReadStatusFilter } from '../../domain/ports/notification.repository.port';
import { PreferenceService } from '../preference/preference.service';
import { TemplateService } from '../template/template.service';
import { NotificationResponse, PreferenceResponse } from './dto/response.dto';
import { toNotificationResponse, toPreferenceResponse } from './notification.mapper';

const LOCALE = 'vi-VN';

export interface NotificationListResult {
  items: NotificationResponse[];
  total: number;
  unreadCount: number;
}

@Injectable()
export class InAppService {
  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly templateService: TemplateService,
    private readonly preferenceService: PreferenceService,
  ) {}

  async list(
    userId: string,
    query: { page: number; size: number; readStatus?: ReadStatusFilter; category?: NotificationCategory },
  ): Promise<NotificationListResult> {
    const { items, total } = await this.notificationRepository.findPaged({
      recipientUserId: userId,
      page: query.page,
      size: query.size,
      readStatus: query.readStatus,
      category: query.category,
    });

    const templates = await this.templateService.loadByKeys(
      items.map((notification) => notification.templateKey),
      LOCALE,
    );
    const mapped = items.map((notification) => {
      const template = templates.get(notification.templateKey);
      const rendered = template ? this.templateService.render(template, notification.data ?? {}) : null;
      return toNotificationResponse(notification, rendered);
    });

    const unreadCount = await this.notificationRepository.countUnread(userId);
    return { items: mapped, total, unreadCount };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.notificationRepository.countUnread(userId);
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findByIdAndRecipient(notificationId, userId);
    if (!notification || notification.channel !== Channel.IN_APP) {
      throw new AppException(ErrorCode.NOTIFICATION_NOT_FOUND);
    }
    await this.notificationRepository.markRead(notificationId, userId);
  }

  async markAllRead(userId: string, before?: string): Promise<number> {
    const beforeDate = before ? new Date(before) : null;
    return this.notificationRepository.markAllRead(userId, beforeDate);
  }

  async listPreferences(userId: string): Promise<PreferenceResponse[]> {
    const preferences = await this.preferenceService.list(userId);
    return preferences.map(toPreferenceResponse);
  }

  async updatePreference(
    userId: string,
    channel: Channel,
    category: NotificationCategory,
    status: PreferenceStatus,
  ): Promise<PreferenceResponse> {
    const preference = await this.preferenceService.update(userId, channel, category, status);
    return toPreferenceResponse(preference);
  }
}
