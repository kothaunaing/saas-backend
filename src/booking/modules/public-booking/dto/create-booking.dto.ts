import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty() @IsString() serviceId!: string;
  @ApiProperty({ description: 'Staff ID or "any"' })
  @IsString()
  staffId!: string;
  @ApiProperty({ example: '2026-09-12' }) @IsDateString() date!: string;
  @ApiProperty({ example: '09:30' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time!: string;
  @ApiProperty() @IsString() @MaxLength(120) customerName!: string;
  @ApiProperty() @IsEmail() customerEmail!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
