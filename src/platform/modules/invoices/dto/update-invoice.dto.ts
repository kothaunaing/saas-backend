import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { InvoiceStatus } from '../../../../generated/prisma/client';

export class UpdateInvoiceDto {
  @ApiProperty({ enum: InvoiceStatus, example: InvoiceStatus.PAID })
  @IsEnum(InvoiceStatus)
  status!: InvoiceStatus;
}
