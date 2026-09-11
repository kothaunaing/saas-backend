import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '../../../../generated/prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
export class CreateSupportTicketDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(160) subject!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(80) category!: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(5000) message!: string;
  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
