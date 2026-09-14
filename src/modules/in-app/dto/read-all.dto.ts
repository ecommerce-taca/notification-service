import { IsDateString, IsOptional } from 'class-validator';

export class ReadAllDto {
  @IsOptional()
  @IsDateString()
  before?: string;
}
