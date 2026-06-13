import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class AnalyticsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  eventType?: string;
}
