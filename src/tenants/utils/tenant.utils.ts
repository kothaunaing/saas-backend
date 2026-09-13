import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma/prisma.service';

export async function getAuthorizedTenant(
  prisma: PrismaService,
  slug: string,
  authorizedTenantId?: string | null,
) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    throw new NotFoundException(`Tenant '${slug}' not found`);
  }
  if (authorizedTenantId && tenant.id !== authorizedTenantId) {
    throw new ForbiddenException('You cannot access this tenant');
  }
  if (tenant.status !== 'ACTIVE' && tenant.status !== 'TRIAL') {
    throw new ForbiddenException('Tenant account is not active');
  }
  return tenant;
}
