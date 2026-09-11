import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PageSizeDto } from '../../../../common/dto/page-size.dto';

export class QueryRewardsDto extends PageSizeDto {
  @ApiPropertyOptional({
    description:
      'Case-insensitive search term for reward name or description',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
