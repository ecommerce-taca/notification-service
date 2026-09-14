import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { NotificationCategory } from '../../../domain/enums/category.enum';

const READ_STATUS_VALUES = ['ALL', 'READ', 'UNREAD'] as const;

export class ListNotificationsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  size?: number;

  @IsOptional()
  @IsIn(READ_STATUS_VALUES as unknown as string[])
  read_status?: (typeof READ_STATUS_VALUES)[number];

  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;
}
