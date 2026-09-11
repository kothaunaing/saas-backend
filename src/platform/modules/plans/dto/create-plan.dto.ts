import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ description: 'Tier name', example: 'Pro' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Price in dollars', example: 79.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ description: 'Billing interval', default: 'month' })
  @IsOptional()
  @IsString()
  interval: string = 'month';

  @ApiPropertyOptional({ description: 'Max locations', example: 3, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  tenantLimit?: number;

  @ApiPropertyOptional({ description: 'Max staff members', example: 10, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  staffLimit?: number;

  @ApiProperty({
    description: 'List of features included in plan',
    type: [String],
    example: ['Automated Reminders', 'Staff Calendars', 'Analytics'],
  })
  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @ApiPropertyOptional({ description: 'Whether plan is active', default: true })
  @IsOptional()
  @IsBoolean()
  active: boolean = true;
}
