import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsInt, IsString, Min } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @ApiProperty({ example: 'Serenity Cloud' })
  @IsString()
  platformName!: string;

  @ApiProperty({ example: 'support@serenity.cloud' })
  @IsEmail()
  supportEmail!: string;

  @ApiProperty({ example: 14, minimum: 0 })
  @IsInt()
  @Min(0)
  trialDays!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  tenantApproval!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  maintenanceMode!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  incidentEmails!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  billingEmails!: boolean;
}
