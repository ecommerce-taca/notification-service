import { Module } from '@nestjs/common';
import { MessagingModule } from '../../infrastructure/messaging/messaging.module';
import { DispatcherModule } from '../dispatcher/dispatcher.module';
import { NotificationModule } from '../notification/notification.module';
import { DeliveryOutboxRelayService } from './delivery-outbox-relay.service';
import { DeliveryRetryService } from './delivery-retry.service';
import { DeliveryService } from './delivery.service';

@Module({
  imports: [DispatcherModule, MessagingModule, NotificationModule],
  providers: [DeliveryService, DeliveryRetryService, DeliveryOutboxRelayService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
