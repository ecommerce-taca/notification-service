import { DeliveryService } from './delivery.service';
import { DispatcherService, DeliverySendError } from '../dispatcher/dispatcher.service';
import { NotificationService } from '../notification/notification.service';
import { DeliveryAttemptRepositoryPort } from '../../domain/ports/delivery-attempt.repository.port';
import { EventPublisherPort } from '../../domain/ports/event-publisher.port';
import { IdGenerator } from '../../domain/ports/id-generator.port';
import { Clock } from '../../domain/ports/clock.port';
import { AppConfigService } from '../../config/app-config';
import { AppLogger } from '../../common/logging/app.logger';
import { Notification } from '../../domain/entities/notification.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationCategory } from '../../domain/enums/category.enum';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';

function makeNotification(status: NotificationStatus): Notification {
  const notification = new Notification();
  Object.assign(notification, {
    id: 'ntf-1',
    recipientUserId: 'user-1',
    recipientEmail: 'buyer@example.com',
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

function setup(retryCount = 3) {
  const dispatcher = { dispatch: jest.fn() } as unknown as jest.Mocked<DispatcherService>;
  const notificationService = {
    findById: jest.fn(),
    updateStatus: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>;
  const deliveryAttemptRepository = {
    save: jest.fn(),
  } as unknown as jest.Mocked<DeliveryAttemptRepositoryPort>;
  const eventPublisher = { publishDeliveryStatus: jest.fn() } as unknown as jest.Mocked<EventPublisherPort>;
  const idGenerator = { generate: jest.fn().mockReturnValue('id-x') } as unknown as jest.Mocked<IdGenerator>;
  const clock = { now: jest.fn().mockReturnValue(new Date('2026-09-01T00:00:00Z')) } as unknown as jest.Mocked<Clock>;
  const config = { config: { delivery: { retryCount, backoffMs: 0 } } } as unknown as AppConfigService;
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
    eventPublisher,
    idGenerator,
    clock,
    config,
    logger,
  );
  return { service, dispatcher, notificationService, deliveryAttemptRepository, eventPublisher };
}

describe('DeliveryService', () => {
  it('should mark SENT and publish delivered on success', async () => {
    const { service, dispatcher, notificationService, eventPublisher } = setup();
    notificationService.findById.mockResolvedValue(makeNotification(NotificationStatus.QUEUED));
    dispatcher.dispatch.mockResolvedValue('sent');

    await service.dispatch('ntf-1');

    expect(notificationService.updateStatus).toHaveBeenCalledWith('ntf-1', NotificationStatus.SENT, expect.any(Object));
    expect(eventPublisher.publishDeliveryStatus).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'delivered' }));
  });

  it('should mark SKIPPED when preference disables email', async () => {
    const { service, dispatcher, notificationService } = setup();
    notificationService.findById.mockResolvedValue(makeNotification(NotificationStatus.QUEUED));
    dispatcher.dispatch.mockResolvedValue('skipped');

    await service.dispatch('ntf-1');

    expect(notificationService.updateStatus).toHaveBeenCalledWith('ntf-1', NotificationStatus.SKIPPED);
  });

  it('should retry retryable failures then succeed', async () => {
    const { service, dispatcher, deliveryAttemptRepository, notificationService } = setup(3);
    notificationService.findById.mockResolvedValue(makeNotification(NotificationStatus.QUEUED));
    dispatcher.dispatch
      .mockRejectedValueOnce(new DeliverySendError('SMTP_TIMEOUT', true))
      .mockRejectedValueOnce(new DeliverySendError('SMTP_TIMEOUT', true))
      .mockResolvedValueOnce('sent');

    await service.dispatch('ntf-1');

    expect(dispatcher.dispatch).toHaveBeenCalledTimes(3);
    expect(deliveryAttemptRepository.save).toHaveBeenCalledTimes(3);
    expect(notificationService.updateStatus).toHaveBeenCalledWith('ntf-1', NotificationStatus.SENT, expect.any(Object));
  });

  it('should mark FAILED and publish failed on permanent failure', async () => {
    const { service, dispatcher, notificationService, eventPublisher } = setup();
    notificationService.findById.mockResolvedValue(makeNotification(NotificationStatus.QUEUED));
    dispatcher.dispatch.mockRejectedValue(new DeliverySendError('SMTP_REJECTED', false));

    await service.dispatch('ntf-1');

    expect(notificationService.updateStatus).toHaveBeenCalledWith('ntf-1', NotificationStatus.FAILED);
    expect(eventPublisher.publishDeliveryStatus).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'failed' }));
  });

  it('should skip dispatch for already SENT notification', async () => {
    const { service, dispatcher, notificationService } = setup();
    notificationService.findById.mockResolvedValue(makeNotification(NotificationStatus.SENT));

    await service.dispatch('ntf-1');

    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });
});
