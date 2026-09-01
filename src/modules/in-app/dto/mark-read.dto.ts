import { IsInt, IsOptional, Min } from 'class-validator';

export class MarkReadDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
