import { Module } from '@nestjs/common';
import { ConsumerModule } from '../../modules/consumer/consumer.module';
import { KafkaConsumerAdapter } from './kafka.consumer.adapter';

// Bootstrap Kafka consumer: import ConsumerModule để lấy NotificationConsumer.
@Module({
  imports: [ConsumerModule],
  providers: [KafkaConsumerAdapter],
})
export class KafkaConsumerModule {}
