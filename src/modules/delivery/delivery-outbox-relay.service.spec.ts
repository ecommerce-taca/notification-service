import { DeliveryOutboxRelayService } from './delivery-outbox-relay.service';
import { DeliveryOutboxRepositoryPort } from '../../domain/ports/delivery-outbox.repository.port';
import { EventPublisherPort, DeliveryStatusEvent } from '../../domain/ports/event-publisher.port';
import { AppConfigService } from '../../config/app-config';
import { AppLogger } from '../../common/logging/app.logger';
import { DeliveryOutbox } from '../../domain/entities/delivery-outbox.entity';
import { Channel } from '../../domain/enums/channel.enum';

function makeOutboxEntry(overrides: Partial<DeliveryOutbox> = {}): DeliveryOutbox {
  const payload: DeliveryStatusEvent = {
    eventId: 'evt-1',
    outcome: 'delivered',
    dedupeKey: 'order:1',
    notificationId: 'ntf-1',
    channel: Channel.EMAIL,
    templateKey: 'order-success-v1',
    errorCode: null,
    occurredAt: '2026-09-01T00:00:00.000Z',
  };
  const entry = new DeliveryOutbox();
  Object.assign(entry, {
    id: 'evt-1',
    aggregateId: 'ntf-1',
    eventType: 'notification.delivered',
    payload,
    createdAt: new Date(),
    publishedAt: null,
    retryCount: 0,
    ...overrides,
  });
  return entry;
}

// relay() chạy nội bộ qua setInterval (onModuleInit) — test gọi trực tiếp method private,
// giống cách repo test các luồng nội bộ khác qua các service method thay vì lifecycle hook.
function callRelay(service: DeliveryOutboxRelayService): Promise<void> {
  return (service as unknown as { relay: () => Promise<void> }).relay();
}

function setup() {
  const outboxRepository = {
    findUnpublished: jest.fn(),
    markPublished: jest.fn().mockResolvedValue(undefined),
    incrementRetryCount: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<DeliveryOutboxRepositoryPort>;
  const eventPublisher = {
    publishDeliveryStatus: jest.fn(),
  } as unknown as jest.Mocked<EventPublisherPort>;
  const config = {
    config: { delivery: { outboxRelayIntervalMs: 5000 } },
  } as unknown as AppConfigService;
  const logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  } as unknown as AppLogger;

  const service = new DeliveryOutboxRelayService(outboxRepository, eventPublisher, config, logger);
  return { service, outboxRepository, eventPublisher, logger };
}

describe('DeliveryOutboxRelayService', () => {
  it('should mark published and not touch retryCount when publish succeeds', async () => {
    const { service, outboxRepository, eventPublisher } = setup();
    const entry = makeOutboxEntry();
    outboxRepository.findUnpublished.mockResolvedValue([entry]);
    eventPublisher.publishDeliveryStatus.mockResolvedValue(undefined);

    await callRelay(service);

    expect(outboxRepository.markPublished).toHaveBeenCalledWith(entry.id);
    expect(outboxRepository.incrementRetryCount).not.toHaveBeenCalled();
  });

  it('should increment retryCount and log warning when publish fails', async () => {
    const { service, outboxRepository, eventPublisher, logger } = setup();
    const entry = makeOutboxEntry();
    outboxRepository.findUnpublished.mockResolvedValue([entry]);
    eventPublisher.publishDeliveryStatus.mockRejectedValue(new Error('kafka down'));

    await callRelay(service);

    expect(outboxRepository.incrementRetryCount).toHaveBeenCalledWith(entry.id);
    expect(outboxRepository.markPublished).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'outbox relay publish failed',
      expect.objectContaining({ outboxId: entry.id }),
    );
  });

  it('should keep processing remaining events when one publish fails', async () => {
    const { service, outboxRepository, eventPublisher } = setup();
    const failing = makeOutboxEntry({ id: 'evt-1' });
    const ok = makeOutboxEntry({ id: 'evt-2', aggregateId: 'ntf-2' });
    outboxRepository.findUnpublished.mockResolvedValue([failing, ok]);
    eventPublisher.publishDeliveryStatus
      .mockRejectedValueOnce(new Error('kafka down'))
      .mockResolvedValueOnce(undefined);

    await callRelay(service);

    expect(outboxRepository.incrementRetryCount).toHaveBeenCalledWith('evt-1');
    expect(outboxRepository.markPublished).toHaveBeenCalledWith('evt-2');
  });
});
