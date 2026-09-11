import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class StaffBreakDto {
  @ApiProperty({ example: '12:00' })
  @IsString()
  start!: string;

  @ApiProperty({ example: '13:00' })
  @IsString()
  end!: string;
}

export class WorkDayDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  dayOfWeek?: number;

  @ApiPropertyOptional({ example: 'Mon' })
  @IsOptional()
  @IsString()
  day?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ example: '09:00' })
  @IsString()
  start!: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  end!: string;

  @ApiPropertyOptional({ type: [StaffBreakDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffBreakDto)
  breaks?: StaffBreakDto[];
}

export class CreateStaffDto {
  @ApiProperty({ description: 'Staff member name', example: 'Elena Vance' })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Staff member email',
    example: 'elena@serenity.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Staff member phone',
    example: '+1 (555) 345-6789',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Role or title',
    example: 'Senior Esthetician',
  })
  @IsString()
  role!: string;

  @ApiPropertyOptional({
    description: 'Whether staff member is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'List of service IDs assigned to this staff member',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @ApiPropertyOptional({
    description: 'Weekly schedule',
    type: [WorkDayDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkDayDto)
  hours?: WorkDayDto[];
}
