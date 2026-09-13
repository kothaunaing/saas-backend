import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  private async authorizedTenant(
    slug: string,
    authorizedTenantId?: string | null,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        currency: true,
        confirmation: true,
        reminders: true,
        loyalty: true,
        pointsPerDollar: true,
        plan: { select: { name: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (authorizedTenantId && tenant.id !== authorizedTenantId)
      throw new ForbiddenException('You cannot access this tenant');
    return tenant;
  }

  private toSettings(
    tenant: Awaited<ReturnType<WorkspaceService['authorizedTenant']>>,
  ) {
    return {
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address,
      currency: tenant.currency,
      confirmation: tenant.confirmation,
      reminders: tenant.reminders,
      loyalty: tenant.loyalty,
      pointsPerDollar: tenant.pointsPerDollar,
      plan: tenant.plan?.name ?? null,
    };
  }

  async settings(slug: string, authorizedTenantId?: string | null) {
    return this.toSettings(
      await this.authorizedTenant(slug, authorizedTenantId),
    );
  }

  async updateSettings(
    slug: string,
    dto: UpdateSettingsDto,
    authorizedTenantId?: string | null,
  ) {
    const tenant = await this.authorizedTenant(slug, authorizedTenantId);
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: dto,
    });
    return this.settings(slug, authorizedTenantId);
  }
}
