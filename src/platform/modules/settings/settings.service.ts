import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async settings() {
    const existing = await this.prisma.platformSettings.findUnique({
      where: { id: 1 },
    });
    if (existing) return existing;
    return this.prisma.platformSettings.create({
      data: {
        id: 1,
        platformName: 'Serenity Cloud',
        supportEmail: 'support@serenity.cloud',
        trialDays: 14,
        tenantApproval: true,
        maintenanceMode: false,
        incidentEmails: true,
        billingEmails: true,
      },
    });
  }

  saveSettings(dto: UpdatePlatformSettingsDto) {
    return this.prisma.platformSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...dto },
      update: dto,
    });
  }
}
