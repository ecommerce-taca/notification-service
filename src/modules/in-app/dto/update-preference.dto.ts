import { IsEnum } from 'class-validator';
import { Channel } from '../../../domain/enums/channel.enum';
import { NotificationCategory } from '../../../domain/enums/category.enum';
import { PreferenceStatus } from '../../../domain/enums/preference-status.enum';

export class UpdatePreferenceDto {
  @IsEnum(Channel)
  channel!: Channel;

  @IsEnum(NotificationCategory)
  category!: NotificationCategory;

  @IsEnum(PreferenceStatus)
  status!: PreferenceStatus;
}
