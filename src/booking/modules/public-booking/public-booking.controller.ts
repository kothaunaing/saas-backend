import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../../auth/auth.types';
import { CurrentUser } from '../../../auth/decorators/current-user/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles/roles.guard';
import { PublicBookingService } from './public-booking.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('public booking')
@Controller('public/salons')
export class PublicBookingController {
  constructor(private readonly bookingService: PublicBookingService) {}

  @Get()
  @ApiOperation({ summary: 'List salons accepting public bookings' })
  salons() {
    return this.bookingService.salons();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a public salon profile and catalog' })
  salon(@Param('slug') slug: string) {
    return this.bookingService.salon(slug);
  }

  @Get(':slug/availability')
  availability(
    @Param('slug') slug: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.bookingService.availability(slug, query);
  }

  @Post(':slug/bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiCreatedResponse({ description: 'Appointment created' })
  create(
    @Param('slug') slug: string,
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingService.create(slug, dto, user);
  }

  @Patch(':slug/bookings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  reschedule(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingService.reschedule(slug, id, dto, user);
  }
}
