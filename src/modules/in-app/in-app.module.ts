import { Module } from '@nestjs/common';
import { AuthModule } from '../../infrastructure/auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { PreferenceModule } from '../preference/preference.module';
import { TemplateModule } from '../template/template.module';
import { InAppService } from './in-app.service';
import { NotificationController } from './notification.controller';

@Module({
  imports: [TemplateModule, PreferenceModule, AuthModule, NotificationModule],
  controllers: [NotificationController],
  providers: [InAppService],
  exports: [InAppService],
})
export class InAppModule {}
