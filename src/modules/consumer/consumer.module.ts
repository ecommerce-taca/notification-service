import { Module } from '@nestjs/common';
import { DeliveryModule } from '../delivery/delivery.module';
import { TemplateModule } from '../template/template.module';
import { NotificationConsumer } from './notification.consumer';

@Module({
  imports: [TemplateModule, DeliveryModule],
  providers: [NotificationConsumer],
  exports: [NotificationConsumer],
})
export class ConsumerModule {}
