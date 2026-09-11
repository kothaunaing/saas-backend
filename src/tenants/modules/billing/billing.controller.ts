import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/client';
import type { AuthUser } from '../../../auth/auth.types';
import { CurrentUser } from '../../../auth/decorators/current-user/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles/roles.guard';
import { BillingService } from './billing.service';
import { ChangePlanDto, UpdatePaymentMethodDto } from './dto/billing.dto';

@ApiTags('tenant billing')
@ApiBearerAuth()
@Controller('tenants/:slug/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT_ADMIN)
export class BillingController {
  constructor(private readonly service: BillingService) {}
  @Get()
  @ApiOperation({
    summary: 'View subscription, payment method, and invoice history',
  })
  overview(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.service.overview(slug, user.tenantId);
  }
  @Put('plan')
  @ApiOperation({ summary: 'Change the tenant subscription plan' })
  plan(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePlanDto,
  ) {
    return this.service.changePlan(slug, user.tenantId, dto.planId);
  }
  @Put('payment-method')
  @ApiOperation({
    summary: 'Replace the masked default payment method metadata',
  })
  payment(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.service.updatePaymentMethod(slug, user.tenantId, dto);
  }
}
