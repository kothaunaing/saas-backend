import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/decorators/current-user/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles/roles.guard';
import type { AuthUser } from '../../../auth/auth.types';
import { WorkspaceService } from './workspace.service';
import { UpdateWorkspaceDto } from './dto/workspace.dto';

@ApiTags('tenant workspace')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT_ADMIN)
export class WorkspaceController {
  constructor(private readonly tenantsService: WorkspaceService) {}

  @Get(':slug/workspace')
  @ApiOperation({ summary: 'Get all operational data for a tenant workspace' })
  workspace(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.tenantsService.workspace(slug, user.tenantId);
  }

  @Put(':slug/workspace')
  @ApiOperation({ summary: 'Atomically replace a tenant workspace snapshot' })
  replace(
    @Param('slug') slug: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tenantsService.replaceWorkspace(slug, dto, user.tenantId);
  }
}
