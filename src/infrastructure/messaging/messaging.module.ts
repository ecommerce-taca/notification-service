import { Module } from '@nestjs/common';
import { EventPublisherPort } from '../../domain/ports/event-publisher.port';
import { KafkaEventPublisher } from './kafka.event.publisher';

// Cung cấp EventPublisherPort (publisher delivery status). Không import ConsumerModule
// để tránh cycle: DeliveryModule import module này, còn KafkaConsumerModule import ConsumerModule.
@Module({
  providers: [{ provide: EventPublisherPort, useClass: KafkaEventPublisher }],
  exports: [EventPublisherPort],
})
export class MessagingModule {}
