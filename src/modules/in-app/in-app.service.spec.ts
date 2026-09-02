import { InAppService } from './in-app.service';
import { NotificationService } from '../notification/notification.service';
import { TemplateService } from '../template/template.service';
import { PreferenceService } from '../preference/preference.service';
import { Notification } from '../../domain/entities/notification.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationCategory } from '../../domain/enums/category.enum';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';
import { ReadStatus } from '../../domain/enums/read-status.enum';
import { ReferenceType } from '../../domain/enums/reference-type.enum';
import { AppException } from '../../common/errors/app.exception';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  const notification = new Notification();
  Object.assign(notification, {
    id: 'ntf-1',
    recipientUserId: 'user-1',
    recipientEncrypted: null,
    recipientHash: null,
    channel: Channel.IN_APP,
    templateKey: 'order-success-v1',
    templateVersion: 1,
    dedupeKey: 'order:1',
    sourceEventId: 'evt-1',
    category: NotificationCategory.ORDER,
    referenceType: ReferenceType.ORDER,
    referenceId: 'order-1',
    data: { order_code: 'TC-1' },
    status: NotificationStatus.SENT,
    readStatus: ReadStatus.UNREAD,
    scheduledAt: new Date('2026-09-01T00:00:00Z'),
    sentAt: new Date('2026-09-01T00:00:01Z'),
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
    ...overrides,
  });
  return notification;
}

function setup() {
  const notificationService = {
    findPaged: jest.fn(),
    countUnread: jest.fn().mockResolvedValue(0),
    findByIdAndRecipient: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>;
  const templateService = {
    loadByKeys: jest.fn().mockResolvedValue(new Map()),
    render: jest.fn().mockReturnValue({ title: 'T', body: 'B' }),
    resolve: jest.fn(),
    resolveByKey: jest.fn(),
    placeholders: jest.fn(),
    pickAllowedFields: jest.fn(),
  } as unknown as jest.Mocked<TemplateService>;
  const preferenceService = {
    list: jest.fn(),
    update: jest.fn(),
    isDisabled: jest.fn(),
    isLockedCategory: jest.fn(),
  } as unknown as jest.Mocked<PreferenceService>;

  const service = new InAppService(notificationService, templateService, preferenceService);
  return { service, notificationService, templateService };
}

describe('InAppService', () => {
  it('should list notifications with unread count', async () => {
    const { service, notificationService } = setup();
    notificationService.findPaged.mockResolvedValue({ items: [makeNotification()], total: 1 });
    notificationService.countUnread.mockResolvedValue(3);

    const result = await service.list('user-1', { page: 1, size: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].notification_id).toBe('ntf-1');
    expect(result.total).toBe(1);
    expect(result.unreadCount).toBe(3);
  });

  it('should throw NOT_FOUND when marking read for another user', async () => {
    const { service, notificationService } = setup();
    notificationService.findByIdAndRecipient.mockResolvedValue(null);

    await expect(service.markRead('user-1', 'ntf-1')).rejects.toBeInstanceOf(AppException);
    await expect(service.markRead('user-1', 'ntf-1')).rejects.toMatchObject({ code: 'NOTIFICATION_NOT_FOUND' });
  });

  it('should throw NOT_FOUND when marking read for email notification', async () => {
    const { service, notificationService } = setup();
    notificationService.findByIdAndRecipient.mockResolvedValue(
      makeNotification({ channel: Channel.EMAIL, recipientEncrypted: 'enc' }),
    );

    await expect(service.markRead('user-1', 'ntf-1')).rejects.toMatchObject({ code: 'NOTIFICATION_NOT_FOUND' });
  });
});
