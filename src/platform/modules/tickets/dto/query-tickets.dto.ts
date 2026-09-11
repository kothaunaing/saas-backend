import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  TicketPriority,
  TicketStatus,
} from '../../../../generated/prisma/client';
import { PageSizeDto } from '../../../../common/dto/page-size.dto';

export class QueryTicketsDto extends PageSizeDto {
  @ApiPropertyOptional({
    description: 'Search term across subject, category, message, or tenant name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: TicketStatus,
    description: 'Filter by ticket status (OPEN, IN_PROGRESS, WAITING, RESOLVED)',
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({
    enum: TicketPriority,
    description: 'Filter by ticket priority (LOW, NORMAL, HIGH, URGENT)',
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({
    description: 'Filter by tenant ID',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
