import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class AvailabilityQueryDto {
  @ApiProperty({ example: '2026-09-12' }) @IsDateString() date!: string;
  @ApiProperty() @IsString() serviceId!: string;
  @ApiProperty({ default: 'any' }) @IsString() staffId: string = 'any';
}
