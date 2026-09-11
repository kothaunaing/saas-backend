import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  TicketPriority,
  TicketStatus,
} from '../../../../generated/prisma/client';

export class CreateTicketDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsString()
  tenantId!: string;

  @ApiProperty({ description: 'Ticket subject line', example: 'Calendar sync latency' })
  @IsString()
  subject!: string;

  @ApiProperty({ description: 'Category', example: 'Technical Support' })
  @IsString()
  category!: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.NORMAL })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiProperty({ description: 'Ticket message' })
  @IsString()
  message!: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
