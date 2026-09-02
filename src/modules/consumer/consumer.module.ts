import { Module } from '@nestjs/common';
import { DeliveryModule } from '../delivery/delivery.module';
import { NotificationModule } from '../notification/notification.module';
import { TemplateModule } from '../template/template.module';
import { NotificationConsumer } from './notification.consumer';

@Module({
  imports: [TemplateModule, DeliveryModule, NotificationModule],
  providers: [NotificationConsumer],
  exports: [NotificationConsumer],
})
export class ConsumerModule {}
