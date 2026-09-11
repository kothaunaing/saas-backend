import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PageSizeDto } from '../../../../common/dto/page-size.dto';

export class QueryPlansDto extends PageSizeDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive search in plan name or interval',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
