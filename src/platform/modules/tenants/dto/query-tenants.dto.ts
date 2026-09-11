import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TenantStatus } from '../../../../generated/prisma/client';
import { PageSizeDto } from '../../../../common/dto/page-size.dto';

export class QueryTenantsDto extends PageSizeDto {
  @ApiPropertyOptional({
    description: 'Search term across business name, owner, email, or city',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: TenantStatus,
    description: 'Filter by tenant status (ACTIVE, TRIAL, PENDING, SUSPENDED)',
  })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({
    description: 'Filter by plan ID',
  })
  @IsOptional()
  @IsString()
  planId?: string;
}
