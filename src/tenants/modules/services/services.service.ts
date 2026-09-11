import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginatedResponse } from '../../../common/dto/page-size.dto';
import { getAuthorizedTenant } from '../../utils/tenant.utils';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServicesDto } from './dto/query-services.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

type ServicePayload = Prisma.ServiceGetPayload<{}>;

export interface ServiceDetail {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  active: boolean;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapService(service: ServicePayload): ServiceDetail {
    return {
      id: service.id,
      name: service.name,
      category: service.category,
      duration: service.duration,
      price: Number(service.price),
      active: service.active,
      description: service.description ?? '',
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  async findMany(
    slug: string,
    query: QueryServicesDto,
    authorizedTenantId?: string | null,
  ): Promise<PaginatedResponse<ServiceDetail>> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );
    const page = query.page > 0 ? query.page : 1;
    const size = query.size > 0 ? query.size : 10;
    const skip = (page - 1) * size;

    const where: Prisma.ServiceWhereInput = {
      tenantId: tenant.id,
    };

    if (query.category && query.category.trim() !== '') {
      where.category = query.category.trim();
    }

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { category: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.service.count({ where }),
      this.prisma.service.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
    ]);

    return {
      data: items.map((s: ServicePayload) => this.mapService(s)),
      meta: {
        total,
        page,
        size,
        totalPages: Math.ceil(total / size) || 1,
      },
    };
  }

  async findOne(
    slug: string,
    id: string,
    authorizedTenantId?: string | null,
  ): Promise<ServiceDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );
    const service = await this.prisma.service.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID '${id}' not found`);
    }

    return this.mapService(service);
  }

  async create(
    slug: string,
    dto: CreateServiceDto,
    authorizedTenantId?: string | null,
  ): Promise<ServiceDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );

    const existing = await this.prisma.service.findUnique({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Service with name '${dto.name}' already exists for this tenant`,
      );
    }

    const created = await this.prisma.service.create({
      data: {
        tenantId: tenant.id,
        name: dto.name,
        category: dto.category,
        duration: dto.duration,
        price: dto.price,
        active: dto.active ?? true,
        description: dto.description,
      },
    });

    return this.mapService(created);
  }

  async update(
    slug: string,
    id: string,
    dto: UpdateServiceDto,
    authorizedTenantId?: string | null,
  ): Promise<ServiceDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );

    const existing = await this.prisma.service.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException(`Service with ID '${id}' not found`);
    }

    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.service.findUnique({
        where: {
          tenantId_name: {
            tenantId: tenant.id,
            name: dto.name,
          },
        },
      });
      if (nameConflict) {
        throw new ConflictException(
          `Service with name '${dto.name}' already exists for this tenant`,
        );
      }
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        duration: dto.duration,
        price: dto.price,
        active: dto.active,
        description: dto.description,
      },
    });

    return this.mapService(updated);
  }

  async remove(
    slug: string,
    id: string,
    authorizedTenantId?: string | null,
  ): Promise<{ success: boolean; id: string }> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );

    const existing = await this.prisma.service.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException(`Service with ID '${id}' not found`);
    }

    await this.prisma.service.delete({
      where: { id },
    });

    return { success: true, id };
  }
}
