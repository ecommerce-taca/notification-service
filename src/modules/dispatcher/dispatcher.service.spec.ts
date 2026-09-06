import { DispatcherService, DeliverySendError } from './dispatcher.service';
import { TemplateService } from '../template/template.service';
import { PreferenceService } from '../preference/preference.service';
import { EmailGatewayPort } from '../../domain/ports/email.gateway.port';
import { AppConfigService } from '../../config/app-config';
import { encryptRecipient } from '../../common/security/recipient-crypto';
import { Notification } from '../../domain/entities/notification.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationCategory } from '../../domain/enums/category.enum';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';
import { ReferenceType } from '../../domain/enums/reference-type.enum';

const SECRET = 'test-encryption-secret-32-chars-minimum';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  const notification = new Notification();
  Object.assign(notification, {
    id: 'ntf-1',
    recipientUserId: 'user-1',
    recipientEncrypted: encryptRecipient('buyer@example.com', SECRET),
    recipientHash: null,
    channel: Channel.EMAIL,
    templateKey: 'order-success-v1',
    templateVersion: 1,
    dedupeKey: 'order:1',
    sourceEventId: 'evt-1',
    category: NotificationCategory.ORDER,
    referenceType: ReferenceType.ORDER,
    referenceId: 'order-1',
    data: { order_code: 'TC-1' },
    status: NotificationStatus.QUEUED,
    readStatus: null,
    scheduledAt: new Date(),
    sentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
  return notification;
}

function setup() {
  const templateService = {
    resolve: jest.fn(),
    resolveByKey: jest.fn(),
    placeholders: jest.fn(),
    pickAllowedFields: jest.fn(),
    render: jest.fn(),
    loadByKeys: jest.fn(),
  } as unknown as jest.Mocked<TemplateService>;
  const preferenceService = {
    isDisabled: jest.fn(),
    isLockedCategory: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<PreferenceService>;
  const emailGateway = { send: jest.fn() } as unknown as jest.Mocked<EmailGatewayPort>;
  const config = { config: { recipientEncryptionSecret: SECRET } } as unknown as AppConfigService;

  const service = new DispatcherService(templateService, preferenceService, emailGateway, config);
  return { service, templateService, preferenceService, emailGateway };
}

describe('DispatcherService', () => {
  it('should mark in-app as sent without calling provider', async () => {
    const { service, emailGateway } = setup();
    const result = await service.dispatch(makeNotification({ channel: Channel.IN_APP, recipientEncrypted: null }));
    expect(result).toMatchObject({ outcome: 'sent', provider: 'in_app', providerMessageId: null });
    expect(emailGateway.send).not.toHaveBeenCalled();
  });

  it('should skip email when preference disabled', async () => {
    const { service, preferenceService, emailGateway } = setup();
    preferenceService.isDisabled.mockResolvedValue(true);

    const result = await service.dispatch(makeNotification());

    expect(result).toMatchObject({ outcome: 'skipped', provider: 'smtp', providerMessageId: null });
    expect(emailGateway.send).not.toHaveBeenCalled();
  });

  it('should bypass preference for SECURITY category', async () => {
    const { service, preferenceService, templateService, emailGateway } = setup();
    emailGateway.send.mockResolvedValue({
      success: true, providerMessageId: 'm1', providerStatus: 'delivered', errorCode: null, retryable: false,
    });
    templateService.resolve.mockResolvedValue({
      id: 'tpl-1', key: 'auth-verification-v1', version: 1, locale: 'vi-VN',
      subject: 'Xác thực', body: '{{verification_code}}', status: 'PUBLISHED', createdAt: new Date(),
    } as never);
    templateService.render.mockReturnValue({ title: 'Xác thực', body: '123456' });

    const result = await service.dispatch(makeNotification({ category: NotificationCategory.SECURITY }));

    expect(result).toMatchObject({ outcome: 'sent', provider: 'smtp', providerMessageId: 'm1' });
    expect(preferenceService.isDisabled).not.toHaveBeenCalled();
    expect(emailGateway.send).toHaveBeenCalled();
  });

  it('should throw DeliverySendError when email send fails', async () => {
    const { service, preferenceService, templateService, emailGateway } = setup();
    preferenceService.isDisabled.mockResolvedValue(false);
    templateService.resolve.mockResolvedValue({
      key: 'order-success-v1', version: 1, locale: 'vi-VN', subject: 's', body: 'b', status: 'PUBLISHED',
    } as never);
    templateService.render.mockReturnValue({ title: 's', body: 'b' });
    emailGateway.send.mockResolvedValue({
      success: false, providerMessageId: null, providerStatus: 'bounced', errorCode: 'SMTP_REJECTED', retryable: false,
    });

    await expect(service.dispatch(makeNotification())).rejects.toBeInstanceOf(DeliverySendError);
  });
});
