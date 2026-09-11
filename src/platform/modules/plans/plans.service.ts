import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginatedResponse } from '../../../common/dto/page-size.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { QueryPlansDto } from './dto/query-plans.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

export interface PlanDetail {
  id: string;
  name: string;
  price: number;
  interval: string;
  tenantLimit: number | null;
  staffLimit: number | null;
  features: string[];
  active: boolean;
  tenantCount: number;
  createdAt: Date;
  updatedAt: Date;
}

type PlanWithCount = Prisma.PlanGetPayload<{
  include: {
    _count: { select: { tenants: true } };
  };
}>;

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  private mapPlan(plan: PlanWithCount): PlanDetail {
    return {
      id: plan.id,
      name: plan.name,
      price: Number(plan.price),
      interval: plan.interval,
      tenantLimit: plan.tenantLimit,
      staffLimit: plan.staffLimit,
      features: plan.features,
      active: plan.active,
      tenantCount: plan._count.tenants,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  async findMany(query: QueryPlansDto): Promise<PaginatedResponse<PlanDetail>> {
    const page = query.page > 0 ? query.page : 1;
    const size = query.size > 0 ? query.size : 10;
    const skip = (page - 1) * size;

    const where: Prisma.PlanWhereInput = {};

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { interval: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.plan.count({ where }),
      this.prisma.plan.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ price: 'asc' }, { id: 'asc' }],
        include: {
          _count: { select: { tenants: true } },
        },
      }),
    ]);

    return {
      data: items.map((p: PlanWithCount) => this.mapPlan(p)),
      meta: {
        total,
        page,
        size,
        totalPages: Math.ceil(total / size) || 1,
      },
    };
  }

  async findOne(id: string): Promise<PlanDetail> {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: { select: { tenants: true } },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID '${id}' not found`);
    }

    return this.mapPlan(plan);
  }

  async create(dto: CreatePlanDto): Promise<PlanDetail> {
    const existing = await this.prisma.plan.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Plan with name '${dto.name}' already exists`);
    }

    const created = await this.prisma.plan.create({
      data: {
        name: dto.name,
        price: dto.price,
        interval: dto.interval ?? 'month',
        tenantLimit: dto.tenantLimit,
        staffLimit: dto.staffLimit,
        features: dto.features,
        active: dto.active ?? true,
      },
      include: {
        _count: { select: { tenants: true } },
      },
    });

    return this.mapPlan(created);
  }

  async update(id: string, dto: UpdatePlanDto): Promise<PlanDetail> {
    const existing = await this.prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Plan with ID '${id}' not found`);
    }

    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.plan.findUnique({
        where: { name: dto.name },
      });
      if (nameConflict) {
        throw new ConflictException(
          `Plan with name '${dto.name}' already exists`,
        );
      }
    }

    const updated = await this.prisma.plan.update({
      where: { id },
      data: dto,
      include: {
        _count: { select: { tenants: true } },
      },
    });

    return this.mapPlan(updated);
  }

  async remove(id: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.prisma.plan.findUnique({
      where: { id },
      include: { _count: { select: { tenants: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Plan with ID '${id}' not found`);
    }

    if (existing._count.tenants > 0) {
      throw new ConflictException(
        `Cannot delete plan because ${existing._count.tenants} active tenant(s) are assigned to it`,
      );
    }

    await this.prisma.plan.delete({ where: { id } });
    return { success: true, id };
  }
}
