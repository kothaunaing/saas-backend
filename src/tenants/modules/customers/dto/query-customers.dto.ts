import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PageSizeDto } from '../../../../common/dto/page-size.dto';

export class QueryCustomersDto extends PageSizeDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive search term for name, email, or phone',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
