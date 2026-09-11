import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class TenantAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}
  async report(
    slug: string,
    authorizedTenantId: string | null,
    date?: string,
    days = 30,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!authorizedTenantId || tenant.id !== authorizedTenantId)
      throw new ForbiddenException('You cannot access this tenant');
    const target = date ?? new Date().toISOString().slice(0, 10);
    const end = new Date(`${target}T23:59:59.999Z`);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days + 1);
    start.setUTCHours(0, 0, 0, 0);
    const [appointments, staff] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { tenantId: tenant.id, startsAt: { gte: start, lte: end } },
        include: {
          service: {
            select: { id: true, name: true, price: true, duration: true },
          },
        },
      }),
      this.prisma.staff.findMany({
        where: { tenantId: tenant.id, active: true },
        include: { hours: true },
      }),
    ]);
    const completed = appointments.filter(
      (item) => item.status === 'COMPLETED',
    );
    const dates = Array.from({ length: days }, (_, index) => {
      const value = new Date(start);
      value.setUTCDate(value.getUTCDate() + index);
      return value;
    });
    const popularity = new Map<
      string,
      { serviceId: string; name: string; bookings: number; revenue: number }
    >();
    for (const item of appointments) {
      const row = popularity.get(item.serviceId) ?? {
        serviceId: item.serviceId,
        name: item.service.name,
        bookings: 0,
        revenue: 0,
      };
      row.bookings++;
      if (item.status === 'COMPLETED')
        row.revenue += Number(item.service.price);
      popularity.set(item.serviceId, row);
    }
    const utilization = staff.map((member) => {
      const available = dates.reduce(
        (sum, current) =>
          sum +
          member.hours
            .filter(
              (hour) => hour.enabled && hour.dayOfWeek === current.getUTCDay(),
            )
            .reduce(
              (total, hour) =>
                total +
                Math.max(0, minutes(hour.endTime) - minutes(hour.startTime)),
              0,
            ),
        0,
      );
      const booked = appointments
        .filter(
          (item) =>
            item.staffId === member.id &&
            !['CANCELLED', 'NO_SHOW'].includes(item.status),
        )
        .reduce((sum, item) => sum + item.service.duration, 0);
      return {
        staffId: member.id,
        name: member.name,
        available,
        booked,
        utilization: available ? round((booked / available) * 100) : 0,
      };
    });
    const availableMinutes = utilization.reduce(
      (sum, row) => sum + row.available,
      0,
    );
    const bookedMinutes = utilization.reduce((sum, row) => sum + row.booked, 0);
    const revenue = completed.reduce(
      (sum, item) => sum + Number(item.service.price),
      0,
    );
    return {
      date: target,
      days,
      revenue,
      totalBookings: appointments.length,
      completedBookings: completed.length,
      cancelledBookings: appointments.filter(
        (item) => item.status === 'CANCELLED',
      ).length,
      noShowBookings: appointments.filter((item) => item.status === 'NO_SHOW')
        .length,
      averageTicket: completed.length ? round(revenue / completed.length) : 0,
      popularServices: [...popularity.values()].sort(
        (a, b) => b.bookings - a.bookings || a.name.localeCompare(b.name),
      ),
      staffUtilization: availableMinutes
        ? round((bookedMinutes / availableMinutes) * 100)
        : 0,
      staff: utilization
        .map(({ available: _available, booked: _booked, ...row }) => row)
        .sort((a, b) => b.utilization - a.utilization),
      dailyRevenue: dates.map((current) => {
        const key = current.toISOString().slice(0, 10);
        return {
          date: key,
          revenue: completed
            .filter((item) => item.startsAt.toISOString().slice(0, 10) === key)
            .reduce((sum, item) => sum + Number(item.service.price), 0),
        };
      }),
    };
  }
}
function minutes(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}
function round(value: number) {
  return Math.round(value * 100) / 100;
}
