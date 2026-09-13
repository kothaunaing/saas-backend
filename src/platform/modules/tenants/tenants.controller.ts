import {
  Body,
  Controller,
  Delete,
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
import { QueryTenantsDto } from './dto/query-tenants.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

@ApiTags('platform tenants')
@ApiBearerAuth()
@Controller('platform/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List and search platform tenants with pagination' })
  findMany(@Query() query: QueryTenantsDto) {
    return this.tenantsService.findMany(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant by ID' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant status or details' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tenant' })
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }
}
