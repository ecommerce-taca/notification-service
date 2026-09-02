import { Module } from '@nestjs/common';
import { PreferenceService } from './preference.service';

@Module({
  providers: [PreferenceService],
  exports: [PreferenceService],
})
export class PreferenceModule {}
