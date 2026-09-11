import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/client';
import { Roles } from '../../../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles/roles.guard';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('platform settings')
@ApiBearerAuth()
@Controller('platform/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get global platform settings' })
  settings() {
    return this.settingsService.settings();
  }

  @Put()
  @ApiOperation({ summary: 'Update global platform settings' })
  saveSettings(@Body() dto: UpdatePlatformSettingsDto) {
    return this.settingsService.saveSettings(dto);
  }
}
