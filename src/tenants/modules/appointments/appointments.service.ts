import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginatedResponse } from '../../../common/dto/page-size.dto';
import { getAuthorizedTenant } from '../../utils/tenant.utils';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { SchedulingService } from '../../../booking/scheduling/scheduling.service';
import { calculateLoyaltyPoints } from '../rewards/utils/loyalty.rules';
import {
  dateTimeToUtc,
  utcDateTimeParts,
  utcDayBounds,
} from '../../../common/utils/datetime';

const DISPLAY_STATUS_MAP: Record<AppointmentStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
};

type AppointmentPayload = Prisma.AppointmentGetPayload<{
  include: {
    customer: true;
    service: true;
    staff: true;
  };
}>;

export interface AppointmentDetail {
  id: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  status: string;
  rawStatus: AppointmentStatus;
  startsAt: Date;
  date: string;
  time: string;
  notes: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  service?: {
    id: string;
    name: string;
    price: number;
    duration: number;
  };
  staff?: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduling: SchedulingService,
  ) {}

  private mapAppointment(item: AppointmentPayload): AppointmentDetail {
    const local = utcDateTimeParts(item.startsAt);
    return {
      id: item.id,
      customerId: item.customerId,
      serviceId: item.serviceId,
      staffId: item.staffId,
      status: DISPLAY_STATUS_MAP[item.status] ?? item.status,
      rawStatus: item.status,
      startsAt: item.startsAt,
      date: local.date,
      time: local.time,
      notes: item.notes ?? '',
      customer: item.customer
        ? {
            id: item.customer.id,
            name: item.customer.name,
            email: item.customer.email,
            phone: item.customer.phone ?? '',
          }
        : undefined,
      service: item.service
        ? {
            id: item.service.id,
            name: item.service.name,
            price: Number(item.service.price),
            duration: item.service.duration,
          }
        : undefined,
      staff: item.staff
        ? {
            id: item.staff.id,
            name: item.staff.name,
            role: item.staff.role,
          }
        : undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private resolveStartsAt(dto: {
    startsAt?: string;
    date?: string;
    time?: string;
  }): Date {
    if (dto.startsAt) {
      const d = new Date(dto.startsAt);
      if (isNaN(d.getTime())) {
        throw new BadRequestException('Invalid startsAt datetime format');
      }
      return d;
    }
    if (dto.date && dto.time) {
      const d = dateTimeToUtc(dto.date, dto.time);
      if (isNaN(d.getTime())) {
        throw new BadRequestException('Invalid date or time format');
      }
      return d;
    }
    throw new BadRequestException(
      'Either startsAt or both date and time must be provided',
    );
  }

  async findMany(
    slug: string,
    query: QueryAppointmentsDto,
    authorizedTenantId?: string | null,
  ): Promise<PaginatedResponse<AppointmentDetail>> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );
    const page = query.page > 0 ? query.page : 1;
    const size = query.size > 0 ? query.size : 10;
    const skip = (page - 1) * size;

    const where: Prisma.AppointmentWhereInput = {
      tenantId: tenant.id,
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.staffId) {
      where.staffId = query.staffId;
    }
    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.date && query.date.trim() !== '') {
      const { start: startOfDay, end: endOfDay } = utcDayBounds(query.date.trim());
      where.startsAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      where.OR = [
        { notes: { contains: s, mode: 'insensitive' } },
        { customer: { name: { contains: s, mode: 'insensitive' } } },
        { customer: { email: { contains: s, mode: 'insensitive' } } },
        { staff: { name: { contains: s, mode: 'insensitive' } } },
        { service: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
        include: {
          customer: true,
          service: true,
          staff: true,
        },
      }),
    ]);

    return {
      data: items.map((a: AppointmentPayload) => this.mapAppointment(a)),
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
  ): Promise<AppointmentDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID '${id}' not found`);
    }

    return this.mapAppointment(appointment);
  }

  async create(
    slug: string,
    dto: CreateAppointmentDto,
    authorizedTenantId?: string | null,
  ): Promise<AppointmentDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );
    const startsAt = this.resolveStartsAt(dto);

    const created = await this.prisma.$transaction(
      async (tx) => {
        const customer = await tx.customer.findFirst({
          where: { id: dto.customerId, tenantId: tenant.id },
          select: { id: true },
        });
        if (!customer)
          throw new NotFoundException('Customer not found for tenant');
        await this.scheduling.assertAvailable(tx, {
          tenantId: tenant.id,
          serviceId: dto.serviceId,
          staffId: dto.staffId,
          startsAt,
          lockStaff: true,
        });
        return tx.appointment.create({
          data: {
            tenantId: tenant.id,
            customerId: dto.customerId,
            serviceId: dto.serviceId,
            staffId: dto.staffId,
            startsAt,
            status: dto.status ?? AppointmentStatus.PENDING,
            notes: dto.notes,
          },
          include: { customer: true, service: true, staff: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return this.mapAppointment(created);
  }

  async update(
    slug: string,
    id: string,
    dto: UpdateAppointmentDto,
    authorizedTenantId?: string | null,
  ): Promise<AppointmentDetail> {
    const tenant = await getAuthorizedTenant(
      this.prisma,
      slug,
      authorizedTenantId,
    );

    const existing = await this.prisma.appointment.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException(`Appointment with ID '${id}' not found`);
    }

    let startsAt: Date | undefined;
    if (dto.startsAt || (dto.date && dto.time)) {
      startsAt = this.resolveStartsAt(dto);
    }

    const updated = await this.prisma.$transaction(
      async (tx) => {
        const customerId = dto.customerId ?? existing.customerId;
        const serviceId = dto.serviceId ?? existing.serviceId;
        const staffId = dto.staffId ?? existing.staffId;
        const nextStartsAt = startsAt ?? existing.startsAt;
        if (dto.customerId) {
          const customer = await tx.customer.findFirst({
            where: { id: customerId, tenantId: tenant.id },
            select: { id: true },
          });
          if (!customer)
            throw new NotFoundException('Customer not found for tenant');
        }
        if (
          dto.serviceId ||
          dto.staffId ||
          startsAt ||
          (dto.status &&
            dto.status !== AppointmentStatus.CANCELLED &&
            dto.status !== AppointmentStatus.NO_SHOW)
        ) {
          await this.scheduling.assertAvailable(tx, {
            tenantId: tenant.id,
            serviceId,
            staffId,
            startsAt: nextStartsAt,
            excludeAppointmentId: id,
            lockStaff: true,
          });
        }
        const enteringCompleted =
          dto.status === AppointmentStatus.COMPLETED &&
          existing.status !== AppointmentStatus.COMPLETED &&
          existing.loyaltyPointsAwarded === 0;
        let loyaltyPointsAwarded: number | undefined;
        if (enteringCompleted && tenant.loyalty && tenant.pointsPerDollar > 0) {
          const pricedService = await tx.service.findFirst({
            where: { id: serviceId, tenantId: tenant.id },
            select: { price: true },
          });
          if (!pricedService)
            throw new NotFoundException('Service not found for tenant');
          loyaltyPointsAwarded = calculateLoyaltyPoints(
            Number(pricedService.price),
            tenant.pointsPerDollar,
          );
          if (loyaltyPointsAwarded > 0) {
            await tx.customer.update({
              where: { id: customerId },
              data: { points: { increment: loyaltyPointsAwarded } },
            });
          }
        }
        return tx.appointment.update({
          where: { id },
          data: {
            customerId: dto.customerId,
            serviceId: dto.serviceId,
            staffId: dto.staffId,
            startsAt,
            status: dto.status,
            notes: dto.notes,
            loyaltyPointsAwarded,
          },
          include: { customer: true, service: true, staff: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return this.mapAppointment(updated);
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

    const existing = await this.prisma.appointment.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException(`Appointment with ID '${id}' not found`);
    }

    await this.prisma.appointment.delete({
      where: { id },
    });

    return { success: true, id };
  }
}
