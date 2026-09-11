import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/client';
import type { AuthUser } from '../../../auth/auth.types';
import { CurrentUser } from '../../../auth/decorators/current-user/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles/roles.guard';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServicesDto } from './dto/query-services.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('tenant services')
@ApiBearerAuth()
@Controller('tenants/:slug/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT_ADMIN)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List and search services with pagination' })
  findMany(
    @Param('slug') slug: string,
    @Query() query: QueryServicesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.servicesService.findMany(slug, query, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by ID' })
  findOne(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.servicesService.findOne(slug, id, user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new service' })
  create(
    @Param('slug') slug: string,
    @Body() dto: CreateServiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.servicesService.create(slug, dto, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service' })
  update(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.servicesService.update(slug, id, dto, user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a service' })
  remove(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.servicesService.remove(slug, id, user.tenantId);
  }
}
