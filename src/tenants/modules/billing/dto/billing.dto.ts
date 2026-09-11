import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

export class ChangePlanDto {
  @ApiProperty() @IsString() planId!: string;
}

export class UpdatePaymentMethodDto {
  @ApiProperty({ example: 'Visa' }) @IsString() brand!: string;
  @ApiProperty({ example: '4242' }) @IsString() @Length(4, 4) last4!: string;
  @ApiProperty({ minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  expMonth!: number;
  @ApiProperty({ minimum: 2026 }) @IsInt() @Min(2026) expYear!: number;
}
