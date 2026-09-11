import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginatedResponse } from '../../../common/dto/page-size.dto';
import { getAuthorizedTenant } from '../../utils/tenant.utils';
import { CreateRewardDto } from './dto/create-reward.dto';
import { QueryRewardsDto } from './dto/query-rewards.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';

type RewardPayload = Prisma.RewardGetPayload<{}>;

export interface RewardDetail {
  id: string;
  name: string;
  points: number;
  description: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapReward(reward: RewardPayload): RewardDetail {
    return {
      id: reward.id,
      name: reward.name,
      points: reward.points,
      description: reward.description ?? '',
      active: reward.active,
      createdAt: reward.createdAt,
      updatedAt: reward.updatedAt,
    };
  }

  async findMany(
    slug: string,
    query: QueryRewardsDto,
    authorizedTenantId?: string | null,
  ): Promise<PaginatedResponse<RewardDetail>> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );
    const page = query.page > 0 ? query.page : 1;
    const size = query.size > 0 ? query.size : 10;
    const skip = (page - 1) * size;

    const where: Prisma.RewardWhereInput = {
      tenantId: tenant.id,
    };

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.reward.count({ where }),
      this.prisma.reward.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ points: 'asc' }, { id: 'asc' }],
      }),
    ]);

    return {
      data: items.map((r: RewardPayload) => this.mapReward(r)),
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
  ): Promise<RewardDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );
    const reward = await this.prisma.reward.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!reward) {
      throw new NotFoundException(`Reward with ID '${id}' not found`);
    }

    return this.mapReward(reward);
  }

  async create(
    slug: string,
    dto: CreateRewardDto,
    authorizedTenantId?: string | null,
  ): Promise<RewardDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );

    const created = await this.prisma.reward.create({
      data: {
        tenantId: tenant.id,
        name: dto.name,
        points: dto.points,
        description: dto.description,
        active: dto.active ?? true,
      },
    });

    return this.mapReward(created);
  }

  async update(
    slug: string,
    id: string,
    dto: UpdateRewardDto,
    authorizedTenantId?: string | null,
  ): Promise<RewardDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );

    const existing = await this.prisma.reward.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException(`Reward with ID '${id}' not found`);
    }

    const updated = await this.prisma.reward.update({
      where: { id },
      data: {
        name: dto.name,
        points: dto.points,
        description: dto.description,
        active: dto.active,
      },
    });

    return this.mapReward(updated);
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

    const existing = await this.prisma.reward.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException(`Reward with ID '${id}' not found`);
    }

    await this.prisma.reward.delete({
      where: { id },
    });

    return { success: true, id };
  }
}
