import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/client';
import type { AuthUser } from '../../../auth/auth.types';
import { CurrentUser } from '../../../auth/decorators/current-user/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles/roles.guard';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
@ApiTags('tenant support')
@ApiBearerAuth()
@Controller('tenants/:slug/support-tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT_ADMIN)
export class SupportController {
  constructor(private readonly service: SupportService) {}
  @Get()
  @ApiOperation({ summary: 'View this tenant support ticket history' })
  list(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.service.list(slug, user.tenantId);
  }
  @Post()
  @ApiCreatedResponse({ description: 'Support ticket submitted' })
  create(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.service.create(slug, user.tenantId, dto);
  }
}
