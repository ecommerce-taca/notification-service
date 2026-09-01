import { Notification } from '../../domain/entities/notification.entity';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import { ReadStatus } from '../../domain/enums/read-status.enum';
import { RenderedMessage } from '../template/template.service';
import { NotificationResponse, PreferenceResponse } from './dto/response.dto';

// Map entity -> response DTO ở đúng một chỗ, không rải trong controller.
export function toNotificationResponse(
  notification: Notification,
  rendered: RenderedMessage | null,
): NotificationResponse {
  return {
    notification_id: notification.id,
    category: notification.category,
    template: notification.templateKey,
    title: rendered?.title ?? '',
    body: rendered?.body ?? '',
    reference: notification.referenceType
      ? { type: notification.referenceType, id: notification.referenceId }
      : null,
    read: notification.readStatus === ReadStatus.READ,
    created_at: notification.createdAt.toISOString(),
  };
}

export function toPreferenceResponse(preference: NotificationPreference): PreferenceResponse {
  return {
    category: preference.category,
    channel: preference.channel,
    status: preference.status,
    locked: preference.locked,
  };
}
