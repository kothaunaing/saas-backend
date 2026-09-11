import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRewardDto {
  @ApiProperty({ description: 'Reward title', example: '$20 Off Any Service' })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Points required to redeem',
    example: 200,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  points!: number;

  @ApiPropertyOptional({ description: 'Reward description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether reward is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
