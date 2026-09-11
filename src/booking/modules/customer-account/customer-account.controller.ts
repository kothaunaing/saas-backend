import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { CurrentUser } from '../../../auth/decorators/current-user/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles/roles.guard';
import type { AuthUser } from '../../../auth/auth.types';
import { CustomerAccountService } from './customer-account.service';
import {
  CreateReviewDto,
  UpdateCustomerProfileDto,
} from './dto/customer-account.dto';

@Controller('customer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CustomerAccountController {
  constructor(private readonly service: CustomerAccountService) {}
  @Get('me') account(@CurrentUser() user: AuthUser) {
    return this.service.account(user);
  }
  @Patch('profile') profile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.service.updateProfile(user, dto);
  }
  @Post('bookings/:id/cancel') cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.cancel(user, id);
  }
  @Post('reviews') review(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.service.review(user, dto);
  }
}
