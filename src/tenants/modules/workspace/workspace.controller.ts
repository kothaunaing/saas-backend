import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/decorators/current-user/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles/roles.guard';
import type { AuthUser } from '../../../auth/auth.types';
import { WorkspaceService } from './workspace.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('tenant workspace')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT_ADMIN)
export class WorkspaceController {
  constructor(private readonly tenantsService: WorkspaceService) {}

  @Get(':slug/settings')
  @ApiOperation({ summary: 'Get tenant workspace settings' })
  settings(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.tenantsService.settings(slug, user.tenantId);
  }

  @Put(':slug/settings')
  @ApiOperation({ summary: 'Update tenant workspace settings' })
  updateSettings(
    @Param('slug') slug: string,
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tenantsService.updateSettings(slug, dto, user.tenantId);
  }
}
