import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/client';
import type { AuthUser } from '../../../auth/auth.types';
import { CurrentUser } from '../../../auth/decorators/current-user/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles/roles.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get('customer/notifications')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'View booking confirmations and reminders' })
  customer(@CurrentUser() user: AuthUser) {
    return this.service.customerNotifications(user);
  }
  @Get('tenants/:slug/notifications') @Roles(UserRole.TENANT_ADMIN) tenant(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.tenantNotifications(slug, user.tenantId);
  }
  @Post('tenants/:slug/notifications/dispatch')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary:
      'Dispatch due email and SMS notifications through the configured webhook',
  })
  dispatch(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.service.dispatch(slug, user.tenantId);
  }
}
