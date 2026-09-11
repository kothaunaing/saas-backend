import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { UpdateWorkspaceDto } from './dto/workspace.dto';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async workspace(slug: string, authorizedTenantId?: string | null) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: {
        plan: true,
        customers: { orderBy: { name: 'asc' } },
        services: { orderBy: { name: 'asc' } },
        staff: {
          include: {
            services: true,
            hours: { include: { breaks: true }, orderBy: { dayOfWeek: 'asc' } },
          },
          orderBy: { name: 'asc' },
        },
        appointments: { orderBy: { startsAt: 'asc' } },
        rewards: { orderBy: { points: 'asc' } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (authorizedTenantId && tenant.id !== authorizedTenantId)
      throw new ForbiddenException('You cannot access this tenant');
    return {
      customers: tenant.customers.map((customer) => {
        const customerAppointments = tenant.appointments.filter(
          (item) => item.customerId === customer.id,
        );
        const visits = tenant.appointments.filter(
          (item) =>
            item.customerId === customer.id && item.status === 'COMPLETED',
        );
        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone ?? '',
          points: customer.points,
          notes: customer.notes ?? '',
          visits: visits.length,
          noShow: customerAppointments.length
            ? Math.round(
                (customerAppointments.filter(
                  (item) => item.status === 'NO_SHOW',
                ).length /
                  customerAppointments.length) *
                  100,
              )
            : 0,
          spent: visits.reduce(
            (sum, item) =>
              sum +
              Number(
                tenant.services.find((service) => service.id === item.serviceId)
                  ?.price ?? 0,
              ),
            0,
          ),
          last:
            visits.at(-1)?.startsAt.toISOString().slice(0, 10) ??
            'Not visited yet',
        };
      }),
      services: tenant.services.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        duration: item.duration,
        price: Number(item.price),
        active: item.active,
        description: item.description ?? '',
      })),
      staff: tenant.staff.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone ?? '',
        role: member.role,
        active: member.active,
        services: member.services.map((item) => item.serviceId),
        hours: member.hours.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.dayOfWeek],
          enabled: day.enabled,
          start: day.startTime,
          end: day.endTime,
          breaks: day.breaks.map((item) => ({
            start: item.startTime,
            end: item.endTime,
          })),
        })),
      })),
      appointments: tenant.appointments.map((item) => ({
        id: item.id,
        customerId: item.customerId,
        serviceId: item.serviceId,
        staffId: item.staffId,
        status: (
          {
            PENDING: 'Pending',
            CONFIRMED: 'Confirmed',
            IN_PROGRESS: 'In progress',
            COMPLETED: 'Completed',
            CANCELLED: 'Cancelled',
            NO_SHOW: 'No-show',
          } as const
        )[item.status],
        date: item.startsAt.toISOString().slice(0, 10),
        time: item.startsAt.toISOString().slice(11, 16),
        notes: item.notes ?? '',
      })),
      rewards: tenant.rewards.map((item) => ({
        id: item.id,
        name: item.name,
        points: item.points,
        description: item.description ?? '',
        active: item.active,
      })),
      settings: {
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        currency: tenant.currency,
        timezone: tenant.timezone,
        confirmation: tenant.confirmation,
        reminders: tenant.reminders,
        loyalty: tenant.loyalty,
        pointsPerDollar: tenant.pointsPerDollar,
        plan: tenant.plan?.name ?? null,
      },
    };
  }

  async replaceWorkspace(
    slug: string,
    dto: UpdateWorkspaceDto,
    authorizedTenantId?: string | null,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!authorizedTenantId || tenant.id !== authorizedTenantId)
      throw new ForbiddenException('You cannot access this tenant');
    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          name: dto.settings.name,
          email: dto.settings.email,
          phone: dto.settings.phone,
          address: dto.settings.address,
          currency: dto.settings.currency,
          timezone: dto.settings.timezone,
          confirmation: dto.settings.confirmation,
          reminders: dto.settings.reminders,
          loyalty: dto.settings.loyalty,
          pointsPerDollar: dto.settings.pointsPerDollar,
        },
      });
      await tx.appointment.deleteMany({ where: { tenantId: tenant.id } });
      await tx.reward.deleteMany({ where: { tenantId: tenant.id } });
      await tx.staff.deleteMany({ where: { tenantId: tenant.id } });
      await tx.service.deleteMany({ where: { tenantId: tenant.id } });
      await tx.customer.deleteMany({ where: { tenantId: tenant.id } });
      await tx.customer.createMany({
        data: dto.customers.map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          tenantId: tenant.id,
          name: item.name,
          email: item.email,
          phone: item.phone,
          points: item.points ?? 0,
          notes: item.notes,
        })),
      });
      await tx.service.createMany({
        data: dto.services.map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          tenantId: tenant.id,
          name: item.name,
          category: item.category,
          duration: item.duration,
          price: item.price,
          active: item.active,
          description: item.description,
        })),
      });
      for (const member of dto.staff) {
        await tx.staff.create({
          data: {
            ...(member.id ? { id: member.id } : {}),
            tenantId: tenant.id,
            name: member.name,
            email: member.email,
            phone: member.phone,
            role: member.role,
            active: member.active,
            services: {
              create: member.services.map((serviceId) => ({ serviceId })),
            },
            hours: {
              create: member.hours.map((day) => ({
                dayOfWeek:
                  day.dayOfWeek ??
                  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
                    day.day ?? '',
                  ),
                enabled: day.enabled,
                startTime: day.start,
                endTime: day.end,
                breaks: {
                  create: day.breaks.map((item) => ({
                    startTime: item.start,
                    endTime: item.end,
                  })),
                },
              })),
            },
          },
        });
      }
      await tx.appointment.createMany({
        data: dto.appointments.map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          tenantId: tenant.id,
          customerId: item.customerId,
          serviceId: item.serviceId,
          staffId: item.staffId,
          startsAt: new Date(`${item.date}T${item.time}:00Z`),
          status: item.status,
          notes: item.notes,
        })),
      });
      await tx.reward.createMany({
        data: dto.rewards.map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          tenantId: tenant.id,
          name: item.name,
          points: item.points,
          description: item.description,
          active: item.active,
        })),
      });
    });
    return this.workspace(slug, authorizedTenantId);
  }
}
