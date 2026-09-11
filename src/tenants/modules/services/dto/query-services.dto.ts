import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PageSizeDto } from '../../../../common/dto/page-size.dto';

export class QueryServicesDto extends PageSizeDto {
  @ApiPropertyOptional({
    description:
      'Case-insensitive search term for name, description, or category',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category name',
  })
  @IsOptional()
  @IsString()
  category?: string;
}
