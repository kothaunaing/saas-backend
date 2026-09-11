import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../../../../generated/prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PageSizeDto } from '../../../../common/dto/page-size.dto';

export class QueryAppointmentsDto extends PageSizeDto {
  @ApiPropertyOptional({
    description:
      'Case-insensitive search in customer name, staff name, service name, or notes',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by date (YYYY-MM-DD)',
    example: '2026-09-15',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    enum: AppointmentStatus,
    description: 'Filter by appointment status',
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({
    description: 'Filter by assigned staff member ID',
  })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
  })
  @IsOptional()
  @IsString()
  customerId?: string;
}
