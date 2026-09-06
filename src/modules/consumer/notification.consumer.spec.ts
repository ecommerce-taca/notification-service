import { NotificationConsumer } from './notification.consumer';
import { ProcessedEventRepositoryPort } from '../../domain/ports/processed-event.repository.port';
import { TemplateService } from '../template/template.service';
import { DeliveryService } from '../delivery/delivery.service';
import { NotificationService } from '../notification/notification.service';
import { IdGenerator } from '../../domain/ports/id-generator.port';
import { Clock } from '../../domain/ports/clock.port';
import { AppConfigService } from '../../config/app-config';
import { AppLogger } from '../../common/logging/app.logger';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationCommand, DomainEvent } from './contracts';

const COMMAND: NotificationCommand = {
  event_id: 'evt-1',
  schema_version: 1,
  command_type: 'AUTH_VERIFICATION_REQUESTED',
  occurred_at: '2026-09-01T00:00:00Z',
  dedupe_key: 'auth:1',
  user_id: 'user-1',
  channel: Channel.EMAIL,
  recipient: 'buyer@example.com',
  template: 'auth-email-verification-v1',
  data: { verification_code: '123456' },
};

function setup() {
  const notificationService = {
    findByDedupeKey: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation(async (n) => n),
  } as unknown as jest.Mocked<NotificationService>;
  const processedEventRepository = {
    existsByEventId: jest.fn().mockResolvedValue(false),
    save: jest.fn().mockImplementation(async (e) => e),
  } as unknown as jest.Mocked<ProcessedEventRepositoryPort>;
  const templateService = {
    resolveByKey: jest.fn().mockResolvedValue({
      id: 'tpl-1', key: 'auth-verification-v1', version: 1, locale: 'vi-VN',
      subject: 'Xác thực', body: '{{verification_code}}', status: 'PUBLISHED', createdAt: new Date(),
    }),
    pickAllowedFields: jest.fn().mockImplementation((_t, data) => data),
    resolve: jest.fn(),
    render: jest.fn(),
    placeholders: jest.fn(),
    loadByKeys: jest.fn(),
  } as unknown as jest.Mocked<TemplateService>;
  const deliveryService = { dispatch: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<DeliveryService>;
  const idGenerator = { generate: jest.fn().mockReturnValue('id-x') } as unknown as jest.Mocked<IdGenerator>;
  const clock = { now: jest.fn().mockReturnValue(new Date('2026-09-01T00:00:00Z')) } as unknown as jest.Mocked<Clock>;
  const config = {
    config: {
      recipientHashSecret: 'test-secret-32-chars-minimum-secret',
      recipientEncryptionSecret: 'test-encryption-secret-32-chars-minimum',
    },
  } as unknown as AppConfigService;
  const logger = {
    error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), log: jest.fn(),
  } as unknown as AppLogger;

  const consumer = new NotificationConsumer(
    notificationService,
    processedEventRepository,
    templateService,
    deliveryService,
    idGenerator,
    clock,
    config,
    logger,
  );
  return { consumer, notificationService, processedEventRepository, deliveryService, logger };
}

describe('NotificationConsumer', () => {
  it('should create notification, mark processed, and dispatch on command', async () => {
    const { consumer, notificationService, processedEventRepository, deliveryService } = setup();

    await consumer.handleCommand(COMMAND, {});

    expect(notificationService.save).toHaveBeenCalled();
    expect(processedEventRepository.save).toHaveBeenCalled();
    expect(deliveryService.dispatch).toHaveBeenCalledWith('id-x');
  });

  it('should skip when event already processed', async () => {
    const { consumer, processedEventRepository, notificationService, deliveryService } = setup();
    processedEventRepository.existsByEventId.mockResolvedValue(true);

    await consumer.handleCommand(COMMAND, {});

    expect(notificationService.save).not.toHaveBeenCalled();
    expect(deliveryService.dispatch).not.toHaveBeenCalled();
  });

  it('should skip unmapped domain event but mark it processed', async () => {
    const { consumer, processedEventRepository, deliveryService } = setup();
    const event: DomainEvent = {
      event_id: 'evt-2',
      schema_version: 1,
      event_type: 'order.created',
      occurred_at: '2026-09-01T00:00:00Z',
      payload: {},
    };

    await consumer.handleDomainEvent(event, {});

    expect(processedEventRepository.save).toHaveBeenCalled();
    expect(deliveryService.dispatch).not.toHaveBeenCalled();
  });

  it('should extract recipient từ payload.buyer (field đã chốt) và không log fallback warning', async () => {
    const { consumer, notificationService, logger } = setup();
    const event: DomainEvent = {
      event_id: 'evt-3',
      schema_version: 1,
      event_type: 'order.paid',
      occurred_at: '2026-09-01T00:00:00Z',
      payload: { buyer: { user_id: 'user-1', email: 'buyer@example.com' }, order_id: 'order-1' },
    };

    await consumer.handleDomainEvent(event, {});

    expect(notificationService.save).toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should log warning nhưng vẫn ingest được khi payload dùng field fallback (chưa đúng field đã chốt)', async () => {
    const { consumer, notificationService, logger } = setup();
    const event: DomainEvent = {
      event_id: 'evt-4',
      schema_version: 1,
      event_type: 'order.paid',
      occurred_at: '2026-09-01T00:00:00Z',
      payload: { user_id: 'user-1', email: 'buyer@example.com', order_id: 'order-1' },
    };

    await consumer.handleDomainEvent(event, {});

    expect(notificationService.save).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'extractRecipient fallback used, payload không đúng field đã chốt',
      expect.objectContaining({ eventType: 'order.paid' }),
    );
  });

  it('should null hoá recipientEncrypted/recipientHash khi command channel=IN_APP dù recipient khác rỗng', async () => {
    const { consumer, notificationService } = setup();
    const command: NotificationCommand = {
      ...COMMAND,
      channel: Channel.IN_APP,
      recipient: 'buyer@example.com',
    };

    await consumer.handleCommand(command, {});

    const saved = notificationService.save.mock.calls[0][0];
    expect(saved.recipientEncrypted).toBeNull();
    expect(saved.recipientHash).toBeNull();
  });
});
