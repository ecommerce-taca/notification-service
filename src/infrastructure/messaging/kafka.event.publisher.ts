import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { AppConfigService } from '../../config/app-config';
import { AppLogger } from '../../common/logging/app.logger';
import { DeliveryStatusEvent, EventPublisherPort } from '../../domain/ports/event-publisher.port';

// Adapter phát event delivery status (notification.delivered.v1 / notification.failed.v1).
// Best-effort observability: không throw để không làm hỏng luồng delivery chính.
@Injectable()
export class KafkaEventPublisher implements EventPublisherPort, OnModuleInit, OnModuleDestroy {
  private producer: Producer | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    const kafka = new Kafka({
      clientId: this.config.config.kafka.clientId,
      brokers: this.config.config.kafka.brokers,
    });
    this.producer = kafka.producer();
    await this.producer.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer?.disconnect();
  }

  async publishDeliveryStatus(event: DeliveryStatusEvent): Promise<void> {
    if (!this.producer) return;
    const topic =
      event.outcome === 'delivered'
        ? this.config.config.kafka.deliveredTopic
        : this.config.config.kafka.failedTopic;

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: event.dedupeKey,
            value: JSON.stringify(event),
            headers: { event_id: event.eventId, event_type: `notification.${event.outcome}` },
          },
        ],
      });
    } catch (err) {
      this.logger.warn('failed to publish delivery status', {
        event: 'delivery.publish_failed',
        notificationId: event.notificationId,
        error: err,
      });
    }
  }
}
