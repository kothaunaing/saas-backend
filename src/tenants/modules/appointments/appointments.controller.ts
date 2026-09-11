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
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentsService } from './appointments.service';

@ApiTags('tenant appointments')
@ApiBearerAuth()
@Controller('tenants/:slug/appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT_ADMIN)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List and search appointments with pagination' })
  findMany(
    @Param('slug') slug: string,
    @Query() query: QueryAppointmentsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.findMany(slug, query, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an appointment by ID' })
  findOne(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.findOne(slug, id, user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an appointment' })
  create(
    @Param('slug') slug: string,
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.create(slug, dto, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an appointment' })
  update(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.update(slug, id, dto, user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an appointment' })
  remove(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.remove(slug, id, user.tenantId);
  }
}
