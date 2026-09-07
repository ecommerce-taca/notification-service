import { Module } from '@nestjs/common';
import { AuthModule } from '../../infrastructure/auth/auth.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { NotificationModule } from '../notification/notification.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, DeliveryModule, NotificationModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
