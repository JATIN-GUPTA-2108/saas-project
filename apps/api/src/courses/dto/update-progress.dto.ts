import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPct?: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
