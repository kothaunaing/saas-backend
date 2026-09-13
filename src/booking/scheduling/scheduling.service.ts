import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { AppointmentStatus, Prisma } from '../../generated/prisma/client';
import { intervalsOverlap, scheduleRuleViolation } from './scheduling.rules';

type DatabaseClient = Prisma.TransactionClient;

export interface ScheduleRequest {
  tenantId: string;
  serviceId: string;
  staffId: string;
  startsAt: Date;
  excludeAppointmentId?: string;
  lockStaff?: boolean;
}

const BLOCKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.COMPLETED,
];

@Injectable()
export class SchedulingService {
  async assertAvailable(
    db: DatabaseClient,
    request: ScheduleRequest,
  ): Promise<void> {
    if (request.lockStaff) {
      // Serializes bookings for one staff member while preserving concurrency
      // between different staff members.
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${request.staffId}))`;
    }

    const [service, staff] = await Promise.all([
      db.service.findFirst({
        where: {
          id: request.serviceId,
          tenantId: request.tenantId,
          active: true,
        },
        select: { duration: true },
      }),
      db.staff.findFirst({
        where: {
          id: request.staffId,
          tenantId: request.tenantId,
          active: true,
          services: { some: { serviceId: request.serviceId } },
        },
        select: { hours: { include: { breaks: true } } },
      }),
    ]);

    if (!service)
      throw new BadRequestException('Service is not active for this tenant');
    if (!staff)
      throw new BadRequestException(
        'Staff member is inactive or not qualified for this service',
      );

    const local = localDateParts(request.startsAt);
    const workDay = staff.hours.find(
      (day) => day.dayOfWeek === local.dayOfWeek,
    );
    const startsMinute = local.hour * 60 + local.minute;
    const violation = scheduleRuleViolation(
      startsMinute,
      service.duration,
      workDay,
    );
    if (violation) throw new BadRequestException(violation);

    const windowStart = new Date(
      request.startsAt.getTime() - 24 * 60 * 60 * 1000,
    );
    const windowEnd = new Date(
      request.startsAt.getTime() + 24 * 60 * 60 * 1000,
    );
    const appointments = await db.appointment.findMany({
      where: {
        tenantId: request.tenantId,
        staffId: request.staffId,
        status: { in: BLOCKING_STATUSES },
        startsAt: { gte: windowStart, lte: windowEnd },
        ...(request.excludeAppointmentId
          ? { id: { not: request.excludeAppointmentId } }
          : {}),
      },
      select: { startsAt: true, service: { select: { duration: true } } },
    });
    const conflict = appointments.some((appointment) => {
      return intervalsOverlap(
        request.startsAt.getTime(),
        service.duration,
        appointment.startsAt.getTime(),
        appointment.service.duration,
      );
    });
    if (conflict)
      throw new ConflictException(
        'Staff member already has an appointment at this time',
      );
  }
}

function localDateParts(date: Date): {
  dayOfWeek: number;
  hour: number;
  minute: number;
} {
  return {
    dayOfWeek: date.getUTCDay(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}
