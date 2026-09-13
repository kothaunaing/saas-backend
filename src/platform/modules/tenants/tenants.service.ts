import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TenantStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginatedResponse } from '../../../common/dto/page-size.dto';
import { QueryTenantsDto } from './dto/query-tenants.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

export interface TenantAdminDetail {
  id: string;
  slug: string;
  name: string;
  owner: string;
  email: string;
  city: string;
  plan: string;
  planId: string | null;
  status: TenantStatus;
  displayStatus: string;
  joined: string;
  locations: number;
  staff: number;
  bookings: number;
  mrr: number;
  lastActive: string;
  createdAt: Date;
  updatedAt: Date;
}

type TenantWithRelations = Prisma.TenantGetPayload<{
  include: {
    plan: true;
    _count: {
      select: { locations: true; staff: true; appointments: true };
    };
  };
}>;

function formatStatus(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapTenant(tenant: TenantWithRelations): TenantAdminDetail {
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      owner: tenant.ownerName,
      email: tenant.email,
      city: tenant.city ?? '',
      plan: tenant.plan?.name ?? 'No plan',
      planId: tenant.planId,
      status: tenant.status,
      displayStatus: formatStatus(tenant.status),
      joined: tenant.createdAt.toISOString().slice(0, 10),
      locations: tenant._count.locations,
      staff: tenant._count.staff,
      bookings: tenant._count.appointments,
      mrr: Number(tenant.plan?.price ?? 0),
      lastActive: tenant.updatedAt.toISOString(),
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  async findMany(
    query: QueryTenantsDto,
  ): Promise<PaginatedResponse<TenantAdminDetail>> {
    const page = query.page > 0 ? query.page : 1;
    const size = query.size > 0 ? query.size : 10;
    const skip = (page - 1) * size;

    const where: Prisma.TenantWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.planId) {
      where.planId = query.planId;
    }

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { ownerName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          plan: true,
          _count: {
            select: { locations: true, staff: true, appointments: true },
          },
        },
      }),
    ]);

    return {
      data: items.map((t: TenantWithRelations) => this.mapTenant(t)),
      meta: {
        total,
        page,
        size,
        totalPages: Math.ceil(total / size) || 1,
      },
    };
  }

  async findOne(id: string): Promise<TenantAdminDetail> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        plan: true,
        _count: {
          select: { locations: true, staff: true, appointments: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }

    return this.mapTenant(tenant);
  }

  async update(id: string, dto: UpdateTenantDto): Promise<TenantAdminDetail> {
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugConflict = await this.prisma.tenant.findUnique({
        where: { slug: dto.slug },
      });
      if (slugConflict) {
        throw new ConflictException('A tenant with this slug already exists');
      }
    }

    if (dto.email && dto.email !== existing.email) {
      const emailConflict = await this.prisma.tenant.findUnique({
        where: { email: dto.email },
      });
      if (emailConflict) {
        throw new ConflictException('A tenant with this email already exists');
      }
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: dto,
      include: {
        plan: true,
        _count: {
          select: { locations: true, staff: true, appointments: true },
        },
      },
    });

    return this.mapTenant(updated);
  }

  async remove(id: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }

    await this.prisma.tenant.delete({ where: { id } });
    return { success: true, id };
  }
}
