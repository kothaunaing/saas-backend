import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/client';
import type { AuthUser } from '../../../auth/auth.types';
import { CurrentUser } from '../../../auth/decorators/current-user/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles/roles.guard';
import { TenantAnalyticsService } from './tenant-analytics.service';
@ApiTags('tenant analytics')
@ApiBearerAuth()
@Controller('tenants/:slug/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT_ADMIN)
export class TenantAnalyticsController {
  constructor(private readonly service: TenantAnalyticsService) {}
  @Get()
  @ApiOperation({
    summary: 'Get daily revenue, popular services, and staff utilization',
  })
  @ApiQuery({ name: 'date', required: false, example: '2026-09-11' })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  report(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUser,
    @Query('date') date?: string,
    @Query('days') days?: string,
  ) {
    return this.service.report(
      slug,
      user.tenantId,
      date,
      Math.min(90, Math.max(1, Number(days) || 30)),
    );
  }
}
