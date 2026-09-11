import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginatedResponse } from '../../../common/dto/page-size.dto';
import { getAuthorizedTenant } from '../../utils/tenant.utils';
import { CreateStaffDto, WorkDayDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type StaffPayload = Prisma.StaffGetPayload<{
  include: {
    services: true;
    hours: { include: { breaks: true } };
  };
}>;

export interface StaffDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  services: string[];
  hours: Array<{
    dayOfWeek: number;
    day: string;
    enabled: boolean;
    start: string;
    end: string;
    breaks: Array<{ start: string; end: string }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  private mapStaff(member: StaffPayload): StaffDetail {
    return {
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone ?? '',
      role: member.role,
      active: member.active,
      services: member.services.map((item) => item.serviceId),
      hours: member.hours.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        day: DAY_NAMES[day.dayOfWeek] ?? 'Mon',
        enabled: day.enabled,
        start: day.startTime,
        end: day.endTime,
        breaks: day.breaks.map((b) => ({
          start: b.startTime,
          end: b.endTime,
        })),
      })),
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    };
  }

  private defaultWorkingHours(): WorkDayDto[] {
    return DAY_NAMES.map((day, dayOfWeek) => ({
      dayOfWeek,
      day,
      enabled: dayOfWeek !== 0,
      start: '09:00',
      end: '17:00',
      breaks: [{ start: '12:00', end: '13:00' }],
    }));
  }

  async findMany(
    slug: string,
    query: QueryStaffDto,
    authorizedTenantId?: string | null,
  ): Promise<PaginatedResponse<StaffDetail>> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );
    const page = query.page > 0 ? query.page : 1;
    const size = query.size > 0 ? query.size : 10;
    const skip = (page - 1) * size;

    const where: Prisma.StaffWhereInput = {
      tenantId: tenant.id,
    };

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { role: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.staff.count({ where }),
      this.prisma.staff.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        include: {
          services: true,
          hours: {
            include: { breaks: true },
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      }),
    ]);

    return {
      data: items.map((m: StaffPayload) => this.mapStaff(m)),
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
  ): Promise<StaffDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );
    const staff = await this.prisma.staff.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        services: true,
        hours: {
          include: { breaks: true },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID '${id}' not found`);
    }

    return this.mapStaff(staff);
  }

  async create(
    slug: string,
    dto: CreateStaffDto,
    authorizedTenantId?: string | null,
  ): Promise<StaffDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );

    const existing = await this.prisma.staff.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: dto.email,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Staff member with email '${dto.email}' already exists for this tenant`,
      );
    }

    const hours =
      dto.hours && dto.hours.length > 0 ? dto.hours : this.defaultWorkingHours();

    const created = await this.prisma.staff.create({
      data: {
        tenantId: tenant.id,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        active: dto.active ?? true,
        services: dto.services
          ? {
              create: dto.services.map((serviceId) => ({ serviceId })),
            }
          : undefined,
        hours: {
          create: hours.map((day) => ({
            dayOfWeek:
              day.dayOfWeek ??
              (day.day ? DAY_NAMES.indexOf(day.day as any) : 0),
            enabled: day.enabled,
            startTime: day.start,
            endTime: day.end,
            breaks: day.breaks
              ? {
                  create: day.breaks.map((b) => ({
                    startTime: b.start,
                    endTime: b.end,
                  })),
                }
              : undefined,
          })),
        },
      },
      include: {
        services: true,
        hours: {
          include: { breaks: true },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    return this.mapStaff(created);
  }

  async update(
    slug: string,
    id: string,
    dto: UpdateStaffDto,
    authorizedTenantId?: string | null,
  ): Promise<StaffDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );

    const existing = await this.prisma.staff.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException(`Staff member with ID '${id}' not found`);
    }

    if (dto.email && dto.email !== existing.email) {
      const conflict = await this.prisma.staff.findUnique({
        where: {
          tenantId_email: {
            tenantId: tenant.id,
            email: dto.email,
          },
        },
      });
      if (conflict) {
        throw new ConflictException(
          `Staff member with email '${dto.email}' already exists for this tenant`,
        );
      }
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (dto.services) {
        await tx.staffService.deleteMany({ where: { staffId: id } });
        await tx.staffService.createMany({
          data: dto.services.map((serviceId) => ({
            staffId: id,
            serviceId,
          })),
        });
      }

      if (dto.hours) {
        await tx.workDay.deleteMany({ where: { staffId: id } });
        for (const day of dto.hours) {
          await tx.workDay.create({
            data: {
              staffId: id,
              dayOfWeek:
                day.dayOfWeek ??
                (day.day ? DAY_NAMES.indexOf(day.day as any) : 0),
              enabled: day.enabled,
              startTime: day.start,
              endTime: day.end,
              breaks: day.breaks
                ? {
                    create: day.breaks.map((b) => ({
                      startTime: b.start,
                      endTime: b.end,
                    })),
                  }
                : undefined,
            },
          });
        }
      }

      await tx.staff.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          role: dto.role,
          active: dto.active,
        },
      });
    });

    return this.findOne(slug, id, authorizedTenantId);
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

    const existing = await this.prisma.staff.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException(`Staff member with ID '${id}' not found`);
    }

    await this.prisma.staff.delete({
      where: { id },
    });

    return { success: true, id };
  }
}
