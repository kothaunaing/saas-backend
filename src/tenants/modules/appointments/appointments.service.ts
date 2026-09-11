import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginatedResponse } from '../../../common/dto/page-size.dto';
import { getAuthorizedTenant } from '../../utils/tenant.utils';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

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
  constructor(private readonly prisma: PrismaService) {}

  private mapAppointment(item: AppointmentPayload): AppointmentDetail {
    return {
      id: item.id,
      customerId: item.customerId,
      serviceId: item.serviceId,
      staffId: item.staffId,
      status: DISPLAY_STATUS_MAP[item.status] ?? item.status,
      rawStatus: item.status,
      startsAt: item.startsAt,
      date: item.startsAt.toISOString().slice(0, 10),
      time: item.startsAt.toISOString().slice(11, 16),
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
      const d = new Date(`${dto.date}T${dto.time}:00Z`);
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
      const startOfDay = new Date(`${query.date.trim()}T00:00:00.000Z`);
      const endOfDay = new Date(`${query.date.trim()}T23:59:59.999Z`);
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

    const [customer, service, staff] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId: tenant.id },
      }),
      this.prisma.service.findFirst({
        where: { id: dto.serviceId, tenantId: tenant.id },
      }),
      this.prisma.staff.findFirst({
        where: { id: dto.staffId, tenantId: tenant.id },
      }),
    ]);

    if (!customer) throw new NotFoundException('Customer not found for tenant');
    if (!service) throw new NotFoundException('Service not found for tenant');
    if (!staff) throw new NotFoundException('Staff member not found for tenant');

    const created = await this.prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        customerId: dto.customerId,
        serviceId: dto.serviceId,
        staffId: dto.staffId,
        startsAt,
        status: dto.status ?? AppointmentStatus.PENDING,
        notes: dto.notes,
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
    });

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

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId: tenant.id },
      });
      if (!customer) throw new NotFoundException('Customer not found for tenant');
    }
    if (dto.serviceId) {
      const service = await this.prisma.service.findFirst({
        where: { id: dto.serviceId, tenantId: tenant.id },
      });
      if (!service) throw new NotFoundException('Service not found for tenant');
    }
    if (dto.staffId) {
      const staff = await this.prisma.staff.findFirst({
        where: { id: dto.staffId, tenantId: tenant.id },
      });
      if (!staff) throw new NotFoundException('Staff member not found for tenant');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        customerId: dto.customerId,
        serviceId: dto.serviceId,
        staffId: dto.staffId,
        startsAt,
        status: dto.status,
        notes: dto.notes,
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
    });

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
