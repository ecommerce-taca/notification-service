import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka, KafkaMessage, Producer } from 'kafkajs';
import { ZodError } from 'zod';
import { AppConfigService } from '../../config/app-config';
import { AppLogger } from '../../common/logging/app.logger';
import { AppException } from '../../common/errors/app.exception';
import { uuidv7 } from '../../common/id/uuidv7';
import { ErrorCode } from '../../common/errors/error-code';
import { RequestContext } from '../../common/http/request-context';
import { redact } from '../../common/logging/redact';
import { MessageMeta, NotificationConsumer } from '../../modules/consumer/notification.consumer';
import { DomainEventSchema, NotificationCommandSchema } from '../../modules/consumer/contracts';

function isCommand(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && 'command_type' in value;
}

function isDomainEvent(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && 'event_type' in value;
}

@Injectable()
export class KafkaConsumerAdapter implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer | null = null;
  private dlqProducer: Producer | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly notificationConsumer: NotificationConsumer,
    private readonly logger: AppLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    const kafkaConfig = this.config.config.kafka;
    const topics = [kafkaConfig.commandTopic, ...kafkaConfig.domainEventTopics].filter(Boolean);

    const kafka = new Kafka({ clientId: kafkaConfig.clientId, brokers: kafkaConfig.brokers });
    this.consumer = kafka.consumer({ groupId: kafkaConfig.groupId });
    this.dlqProducer = kafka.producer();

    await this.dlqProducer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({ topics, fromBeginning: false });

    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        await this.handleMessage(topic, partition, message);
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
    await this.dlqProducer?.disconnect();
  }

  private async handleMessage(topic: string, partition: number, message: KafkaMessage): Promise<void> {
    const meta = this.extractMeta(message);
    const raw = message.value?.toString() ?? '';

    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      this.logger.warn('invalid json message, sending to dlq', { event: 'consumer.invalid_json', topic });
      await this.sendDlq(topic, message, 'INVALID_JSON');
      await this.commit(topic, partition, message.offset);
      return;
    }

    try {
      await RequestContext.run({ requestId: meta.requestId ?? uuidv7(), traceId: meta.traceId }, async () => {
        if (isCommand(value)) {
          await this.notificationConsumer.handleCommand(NotificationCommandSchema.parse(value), meta);
        } else if (isDomainEvent(value)) {
          await this.notificationConsumer.handleDomainEvent(DomainEventSchema.parse(value), meta);
        } else {
          throw new AppException(ErrorCode.NOTIFICATION_INVALID_INPUT, { context: { topic } });
        }
      });
      await this.commit(topic, partition, message.offset);
    } catch (err) {
      // Schema/business validation sai -> lỗi vĩnh viễn, đẩy DLQ rồi commit (không retry vô ích).
      if (err instanceof ZodError || err instanceof AppException) {
        const reason = err instanceof ZodError ? 'SCHEMA_INVALID' : err.code;
        this.logger.warn('invalid message, sending to dlq', { event: 'consumer.invalid_message', topic, reason });
        await this.sendDlq(topic, message, reason);
        await this.commit(topic, partition, message.offset);
        return;
      }
      // Lỗi hạ tầng (DB/Kafka) -> không commit, Kafka sẽ redeliver.
      this.logger.error('consumer processing failed, will retry', err, { event: 'consumer.error', topic });
    }
  }

  private async sendDlq(topic: string, message: KafkaMessage, error: string): Promise<void> {
    if (!this.dlqProducer) return;
    const original = this.redactedOriginal(message.value?.toString() ?? '');
    await this.dlqProducer.send({
      topic: this.config.config.kafka.dlqTopic,
      messages: [
        {
          key: message.key?.toString(),
          value: JSON.stringify({ topic, error, original }),
        },
      ],
    });
  }

  private redactedOriginal(raw: string): unknown {
    try {
      return redact(JSON.parse(raw));
    } catch {
      return raw;
    }
  }

  private async commit(topic: string, partition: number, offset: string): Promise<void> {
    try {
      await this.consumer?.commitOffsets([{ topic, partition, offset: (Number(offset) + 1).toString() }]);
    } catch (err) {
      this.logger.warn('commit offsets failed', { event: 'consumer.commit_failed', topic, partition, error: err });
    }
  }

  private extractMeta(message: KafkaMessage): MessageMeta {
    const headers = message.headers ?? {};
    const requestId = this.headerString(headers['request_id'] ?? headers['x-request-id']);
    const traceId = this.traceIdFromTraceparent(this.headerString(headers['traceparent']));
    return { requestId, traceId };
  }

  private headerString(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (Buffer.isBuffer(value)) return value.toString();
    if (Array.isArray(value)) {
      const first = value[0];
      if (typeof first === 'string') return first;
      if (Buffer.isBuffer(first)) return first.toString();
    }
    return undefined;
  }

  private traceIdFromTraceparent(traceparent: string | undefined): string | undefined {
    if (!traceparent) return undefined;
    const parts = traceparent.split('-');
    return parts.length === 4 ? parts[1] : undefined;
  }
}
