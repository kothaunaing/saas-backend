import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer full name', example: 'Sarah Jenkins' })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'sarah@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+1 (555) 234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Loyalty points balance',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @ApiPropertyOptional({
    description: 'Internal staff notes',
    example: 'Prefers quiet sessions',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
