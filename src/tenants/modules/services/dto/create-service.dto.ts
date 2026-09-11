import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ description: 'Service name', example: 'Swedish Massage' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Category', example: 'Massage' })
  @IsString()
  category!: string;

  @ApiProperty({ description: 'Duration in minutes', example: 60, minimum: 1 })
  @IsInt()
  @Min(1)
  duration!: number;

  @ApiProperty({
    description: 'Price in currency units',
    example: 95.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({
    description: 'Whether service is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Service description' })
  @IsOptional()
  @IsString()
  description?: string;
}
