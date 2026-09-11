import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PageSizeDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    description: 'Page number (1-indexed)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    maximum: 100,
    description: 'Number of items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size: number = 10;
}

export interface PaginationMeta {
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface PaginatedResponse<T, S = unknown> {
  data: T[];
  sideData?: S;
  meta: PaginationMeta;
}
