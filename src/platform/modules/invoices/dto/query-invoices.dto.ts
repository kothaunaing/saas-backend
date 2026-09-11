import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InvoiceStatus } from '../../../../generated/prisma/client';
import { PageSizeDto } from '../../../../common/dto/page-size.dto';

export class QueryInvoicesDto extends PageSizeDto {
  @ApiPropertyOptional({
    description: 'Search by tenant name, owner, or email',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: InvoiceStatus,
    description: 'Filter by invoice status (PAID, DUE, FAILED, REFUNDED)',
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    description: 'Filter by tenant ID',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
