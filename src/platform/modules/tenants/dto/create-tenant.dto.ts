import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { TenantStatus } from '../../../../generated/prisma/client';

export class CreateTenantDto {
  @ApiProperty({ description: 'Unique URL slug', example: 'serenity' })
  @IsString()
  slug!: string;

  @ApiProperty({ description: 'Business display name', example: 'Serenity Spa & Salon' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Owner full name', example: 'Nandar Aye' })
  @IsString()
  ownerName!: string;

  @ApiProperty({ description: 'Business contact email', example: 'owner@serenity.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'City/Location', example: 'Yangon' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Assigned plan ID' })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({ enum: TenantStatus, default: TenantStatus.TRIAL })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}
