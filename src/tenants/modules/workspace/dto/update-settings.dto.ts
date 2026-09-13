import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSettingsDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiProperty() @IsString() currency!: string;
  @ApiProperty() @IsBoolean() confirmation!: boolean;
  @ApiProperty() @IsBoolean() reminders!: boolean;
  @ApiProperty() @IsBoolean() loyalty!: boolean;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) pointsPerDollar!: number;
}
