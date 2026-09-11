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
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

@ApiTags('tenant staff')
@ApiBearerAuth()
@Controller('tenants/:slug/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT_ADMIN)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'List and search staff members with pagination' })
  findMany(
    @Param('slug') slug: string,
    @Query() query: QueryStaffDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.findMany(slug, query, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a staff member by ID' })
  findOne(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.findOne(slug, id, user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new staff member' })
  create(
    @Param('slug') slug: string,
    @Body() dto: CreateStaffDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.create(slug, dto, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a staff member' })
  update(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.update(slug, id, dto, user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a staff member' })
  remove(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.remove(slug, id, user.tenantId);
  }
}
