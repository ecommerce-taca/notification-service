import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config';
import { AppLogger } from '../../common/logging/app.logger';
import { DeliveryOutboxRepositoryPort } from '../../domain/ports/delivery-outbox.repository.port';
import { EventPublisherPort } from '../../domain/ports/event-publisher.port';

// Relay publish delivery status từ outbox (ghi cùng transaction với đổi status khi finalize).
// Publish thất bại thì giữ lại để retry lần sau — at-least-once, consumer dedupe theo eventId.
@Injectable()
export class DeliveryOutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly outboxRepository: DeliveryOutboxRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.config.config.delivery.outboxRelayIntervalMs;
    this.timer = setInterval(() => {
      void this.relay();
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async relay(): Promise<void> {
    const events = await this.outboxRepository.findUnpublished(100);
    for (const event of events) {
      try {
        await this.eventPublisher.publishDeliveryStatus(event.payload);
        await this.outboxRepository.markPublished(event.id);
      } catch (err) {
        this.logger.warn('outbox relay publish failed', {
          event: 'delivery.outbox_publish_failed',
          outboxId: event.id,
          error: err,
        });
      }
    }
  }
}
