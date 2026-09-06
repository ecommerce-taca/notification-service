import { Module } from '@nestjs/common';
import { EmailModule } from '../../infrastructure/email/email.module';
import { PreferenceModule } from '../preference/preference.module';
import { TemplateModule } from '../template/template.module';
import { DispatcherService } from './dispatcher.service';

@Module({
  imports: [TemplateModule, PreferenceModule, EmailModule],
  providers: [DispatcherService],
  exports: [DispatcherService],
})
export class DispatcherModule {}
