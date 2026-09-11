import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/client';
import { Roles } from '../../../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles/roles.guard';
import { ErrorsService } from './errors.service';
@ApiTags('platform errors')
@ApiBearerAuth()
@Controller('platform/errors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class ErrorsController {
  constructor(private readonly service: ErrorsService) {}
  @Get() @ApiOperation({ summary: 'Monitor recent system errors' }) list(
    @Query('status') status?: 'OPEN' | 'RESOLVED',
  ) {
    return this.service.findMany(status);
  }
  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Mark a system error as resolved' })
  resolve(@Param('id') id: string) {
    return this.service.resolve(id);
  }
}
