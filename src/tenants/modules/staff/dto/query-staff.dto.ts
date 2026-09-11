import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PageSizeDto } from '../../../../common/dto/page-size.dto';

export class QueryStaffDto extends PageSizeDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive search term for name, email, or role',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
