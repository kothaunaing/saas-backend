import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginatedResponse } from '../../../common/dto/page-size.dto';
import { getAuthorizedTenant } from '../../utils/tenant.utils';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

type CustomerWithAppointments = Prisma.CustomerGetPayload<{
  include: { appointments: { include: { service: true } } };
}>;

export interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  points: number;
  notes: string;
  visits: number;
  noShow: number;
  spent: number;
  last: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private mapCustomer(customer: CustomerWithAppointments): CustomerDetail {
    const visits = customer.appointments.filter(
      (a) => a.status === 'COMPLETED',
    );
    const noShow = customer.appointments.filter(
      (a) => a.status === 'NO_SHOW',
    ).length;
    const spent = visits.reduce(
      (sum, a) => sum + Number(a.service?.price ?? 0),
      0,
    );
    const last =
      visits.at(-1)?.startsAt.toISOString().slice(0, 10) ?? 'Not visited yet';

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone ?? '',
      points: customer.points,
      notes: customer.notes ?? '',
      visits: visits.length,
      noShow,
      spent,
      last,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  async findMany(
    slug: string,
    query: QueryCustomersDto,
    authorizedTenantId?: string | null,
  ): Promise<PaginatedResponse<CustomerDetail>> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );
    const page = query.page > 0 ? query.page : 1;
    const size = query.size > 0 ? query.size : 10;
    const skip = (page - 1) * size;

    const where: Prisma.CustomerWhereInput = {
      tenantId: tenant.id,
    };

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        include: {
          appointments: {
            include: { service: true },
            orderBy: { startsAt: 'asc' },
          },
        },
      }),
    ]);

    return {
      data: items.map((c: CustomerWithAppointments) => this.mapCustomer(c)),
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
  ): Promise<CustomerDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        appointments: {
          include: { service: true },
          orderBy: { startsAt: 'asc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID '${id}' not found`);
    }

    return this.mapCustomer(customer);
  }

  async create(
    slug: string,
    dto: CreateCustomerDto,
    authorizedTenantId?: string | null,
  ): Promise<CustomerDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );

    const existing = await this.prisma.customer.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: dto.email,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Customer with email '${dto.email}' already exists for this tenant`,
      );
    }

    const created = await this.prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        points: dto.points ?? 0,
        notes: dto.notes,
      },
      include: {
        appointments: {
          include: { service: true },
        },
      },
    });

    return this.mapCustomer(created);
  }

  async update(
    slug: string,
    id: string,
    dto: UpdateCustomerDto,
    authorizedTenantId?: string | null,
  ): Promise<CustomerDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );

    const existing = await this.prisma.customer.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException(`Customer with ID '${id}' not found`);
    }

    if (dto.email && dto.email !== existing.email) {
      const emailConflict = await this.prisma.customer.findUnique({
        where: {
          tenantId_email: {
            tenantId: tenant.id,
            email: dto.email,
          },
        },
      });
      if (emailConflict) {
        throw new ConflictException(
          `Customer with email '${dto.email}' already exists for this tenant`,
        );
      }
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        points: dto.points,
        notes: dto.notes,
      },
      include: {
        appointments: {
          include: { service: true },
        },
      },
    });

    return this.mapCustomer(updated);
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

    const existing = await this.prisma.customer.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException(`Customer with ID '${id}' not found`);
    }

    await this.prisma.customer.delete({
      where: { id },
    });

    return { success: true, id };
  }
}
