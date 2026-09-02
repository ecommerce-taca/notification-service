import { DeliveryService } from './delivery.service';
import { DeliverySendError, DispatcherService } from '../dispatcher/dispatcher.service';
import { NotificationService } from '../notification/notification.service';
import { DeliveryAttemptRepositoryPort } from '../../domain/ports/delivery-attempt.repository.port';
import { DeliveryOutboxRepositoryPort } from '../../domain/ports/delivery-outbox.repository.port';
import { IdGenerator } from '../../domain/ports/id-generator.port';
import { Clock } from '../../domain/ports/clock.port';
import { AppConfigService } from '../../config/app-config';
import { AppLogger } from '../../common/logging/app.logger';
import { Notification } from '../../domain/entities/notification.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationCategory } from '../../domain/enums/category.enum';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';
import { AttemptStatus } from '../../domain/enums/attempt-status.enum';

function makeNotification(status: NotificationStatus): Notification {
  const notification = new Notification();
  Object.assign(notification, {
    id: 'ntf-1',
    recipientUserId: 'user-1',
    recipientEncrypted: 'enc-recipient',
    recipientHash: null,
    channel: Channel.EMAIL,
    templateKey: 'order-success-v1',
    templateVersion: 1,
    dedupeKey: 'order:1',
    sourceEventId: 'evt-1',
    category: NotificationCategory.ORDER,
    referenceType: null,
    referenceId: null,
    data: {},
    status,
    readStatus: null,
    scheduledAt: new Date(),
    sentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return notification;
}

function setup(maxAttempts = 3) {
  const dispatcher = {
    dispatch: jest.fn(),
    providerFor: jest.fn().mockReturnValue('smtp'),
  } as unknown as jest.Mocked<DispatcherService>;
  const notificationService = {
    tryClaimProcessing: jest.fn().mockResolvedValue(true),
    findById: jest.fn(),
    updateStatus: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>;
  const deliveryAttemptRepository = {
    findLastAttemptNo: jest.fn().mockResolvedValue(0),
    save: jest.fn(),
    findByNotificationIds: jest.fn(),
  } as unknown as jest.Mocked<DeliveryAttemptRepositoryPort>;
  const deliveryOutboxRepository = {
    recordSent: jest.fn().mockResolvedValue(undefined),
    recordFailed: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<DeliveryOutboxRepositoryPort>;
  const idGenerator = { generate: jest.fn().mockReturnValue('id-x') } as unknown as jest.Mocked<IdGenerator>;
  const clock = { now: jest.fn().mockReturnValue(new Date('2026-09-01T00:00:00Z')) } as unknown as jest.Mocked<Clock>;
  const config = {
    config: { delivery: { maxAttempts, backoffMs: 0, staleAfterMs: 60000 } },
  } as unknown as AppConfigService;
  const logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  } as unknown as AppLogger;

  const service = new DeliveryService(
    dispatcher,
    notificationService,
    deliveryAttemptRepository,
    deliveryOutboxRepository,
    idGenerator,
    clock,
    config,
    logger,
  );
  return { service, dispatcher, notificationService, deliveryAttemptRepository, deliveryOutboxRepository, logger };
}

describe('DeliveryService', () => {
  it('should record SENT via outbox on success', async () => {
    const { service, dispatcher, notificationService, deliveryOutboxRepository } = setup();
    notificationService.findById.mockResolvedValue(makeNotification(NotificationStatus.QUEUED));
    dispatcher.dispatch.mockResolvedValue({ outcome: 'sent', provider: 'smtp', providerMessageId: 'm1' });

    await service.dispatch('ntf-1');

    expect(deliveryOutboxRepository.recordSent).toHaveBeenCalledTimes(1);
    const [id, , attempt, event] = deliveryOutboxRepository.recordSent.mock.calls[0];
    expect(id).toBe('ntf-1');
    expect(attempt.status).toBe(AttemptStatus.SENT);
    expect(attempt.provider).toBe('smtp');
    expect(attempt.providerMessageId).toBe('m1');
    expect(event.outcome).toBe('delivered');
  });

  it('should not flip FAILED when finalize fails after successful send', async () => {
    const { service, dispatcher, notificationService, deliveryOutboxRepository, logger } = setup();
    notificationService.findById.mockResolvedValue(makeNotification(NotificationStatus.QUEUED));
    dispatcher.dispatch.mockResolvedValue({ outcome: 'sent', provider: 'smtp', providerMessageId: null });
    deliveryOutboxRepository.recordSent.mockRejectedValue(new Error('db down'));

    await service.dispatch('ntf-1');

    expect(deliveryOutboxRepository.recordFailed).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('should record SKIPPED when preference disables email', async () => {
    const { service, dispatcher, notificationService, deliveryAttemptRepository } = setup();
    notificationService.findById.mockResolvedValue(makeNotification(NotificationStatus.QUEUED));
    dispatcher.dispatch.mockResolvedValue({ outcome: 'skipped', provider: 'smtp', providerMessageId: null });

    await service.dispatch('ntf-1');

    expect(notificationService.updateStatus).toHaveBeenCalledWith('ntf-1', NotificationStatus.SKIPPED);
    expect(deliveryAttemptRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: AttemptStatus.SKIPPED }));
  });

  it('should mark RETRY_EXHAUSTED when retryable error exhausts budget', async () => {
    const { service, dispatcher, notificationService, deliveryAttemptRepository, deliveryOutboxRepository } = setup(3);
    notificationService.findById.mockResolvedValue(makeNotification(NotificationStatus.QUEUED));
    dispatcher.dispatch.mockRejectedValue(new DeliverySendError('SMTP_TIMEOUT', true, 'smtp'));

    await service.dispatch('ntf-1');

    expect(deliveryAttemptRepository.save).toHaveBeenCalledTimes(2); // attempt 1,2 là RETRYABLE_FAILED
    expect(deliveryOutboxRepository.recordFailed).toHaveBeenCalledTimes(1);
    const [, attempt] = deliveryOutboxRepository.recordFailed.mock.calls[0];
    expect(attempt.status).toBe(AttemptStatus.RETRY_EXHAUSTED);
  });

  it('should record PERMANENT_FAILED on non-retryable error', async () => {
    const { service, dispatcher, notificationService, deliveryOutboxRepository } = setup();
    notificationService.findById.mockResolvedValue(makeNotification(NotificationStatus.QUEUED));
    dispatcher.dispatch.mockRejectedValue(new DeliverySendError('SMTP_REJECTED', false, 'smtp'));

    await service.dispatch('ntf-1');

    expect(deliveryOutboxRepository.recordFailed).toHaveBeenCalledTimes(1);
    const [, attempt] = deliveryOutboxRepository.recordFailed.mock.calls[0];
    expect(attempt.status).toBe(AttemptStatus.PERMANENT_FAILED);
  });

  it('should not dispatch when claim fails (another worker claimed)', async () => {
    const { service, dispatcher, notificationService } = setup();
    notificationService.tryClaimProcessing.mockResolvedValue(false);

    await service.dispatch('ntf-1');

    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('should continue attemptNo from last attempt (monotonic)', async () => {
    const { service, dispatcher, notificationService, deliveryAttemptRepository, deliveryOutboxRepository } = setup();
    notificationService.findById.mockResolvedValue(makeNotification(NotificationStatus.PROCESSING));
    deliveryAttemptRepository.findLastAttemptNo.mockResolvedValue(2);
    dispatcher.dispatch.mockResolvedValue({ outcome: 'sent', provider: 'smtp', providerMessageId: null });

    await service.dispatch('ntf-1');

    const [, , attempt] = deliveryOutboxRepository.recordSent.mock.calls[0];
    expect(attempt.attemptNo).toBe(3);
  });
});
