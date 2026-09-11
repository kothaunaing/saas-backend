import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../../../../generated/prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId!: string;

  @ApiProperty({ description: 'Service ID' })
  @IsString()
  serviceId!: string;

  @ApiProperty({ description: 'Staff member ID' })
  @IsString()
  staffId!: string;

  @ApiPropertyOptional({
    description: 'Appointment start datetime (ISO string)',
    example: '2026-09-15T14:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({
    description: 'Appointment date (YYYY-MM-DD)',
    example: '2026-09-15',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Appointment time (HH:mm)',
    example: '14:30',
  })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Appointment notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
