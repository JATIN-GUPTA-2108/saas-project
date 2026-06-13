import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class GenerateQuizDto {
  @IsUUID()
  lessonId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(15)
  questionCount?: number;
}
