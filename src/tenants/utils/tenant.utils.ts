import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

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
  return tenant;
}
