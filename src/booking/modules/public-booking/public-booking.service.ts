import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import type { AuthUser } from '../../../auth/auth.types';
import { SchedulingService } from '../../scheduling/scheduling.service';

@Injectable()
export class PublicBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduling: SchedulingService,
  ) {}

  async salons() {
    const rows = await this.prisma.tenant.findMany({
      where: { status: { in: ['ACTIVE', 'TRIAL'] } },
      orderBy: { name: 'asc' },
      select: {
        slug: true,
        name: true,
        tagline: true,
        address: true,
        city: true,
        imageUrl: true,
        _count: { select: { reviews: true, services: true } },
        reviews: { select: { rating: true } },
      },
    });
    return rows.map(({ reviews, _count, ...salon }) => ({
      ...salon,
      reviewCount: _count.reviews,
      serviceCount: _count.services,
      rating: reviews.length
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : null,
    }));
  }

  async salon(slug: string) {
    const salon = await this.prisma.tenant.findFirst({
      where: { slug, status: { in: ['ACTIVE', 'TRIAL'] } },
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        description: true,
        address: true,
        phone: true,
        imageUrl: true,
        amenities: true,
        timezone: true,
        currency: true,
        services: { where: { active: true }, orderBy: { name: 'asc' } },
        staff: {
          where: { active: true },
          include: { services: true, hours: { include: { breaks: true } } },
        },
        rewards: { where: { active: true }, orderBy: { points: 'asc' } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            service: { select: { name: true } },
            staff: { select: { name: true } },
          },
        },
      },
    });
    if (!salon) throw new NotFoundException('Salon not found');
    return {
      ...salon,
      services: salon.services.map((service) => ({
        ...service,
        price: Number(service.price),
      })),
      staff: salon.staff.map((member) => ({
        ...member,
        services: member.services.map((item) => item.serviceId),
        hours: member.hours.map((day) => ({
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
      reviews: salon.reviews.map((review) => ({
        id: review.id,
        salonId: slug,
        bookingId: review.appointmentId,
        name: review.authorName,
        service: review.service?.name ?? '',
        staff: review.staff?.name ?? '',
        rating: review.rating,
        text: review.text,
        date: review.createdAt.toISOString().slice(0, 10),
      })),
    };
  }

  async availability(
    slug: string,
    query: AvailabilityQueryDto,
    excludeAppointmentId?: string,
  ) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: { in: ['ACTIVE', 'TRIAL'] } },
    });
    if (!tenant) throw new NotFoundException('Salon not found');
    const service = await this.prisma.service.findFirst({
      where: { id: query.serviceId, tenantId: tenant.id, active: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    const staff = await this.prisma.staff.findMany({
      where: {
        tenantId: tenant.id,
        active: true,
        ...(query.staffId === 'any' ? {} : { id: query.staffId }),
        services: { some: { serviceId: service.id } },
      },
      include: { hours: { include: { breaks: true } } },
    });
    const dayOfWeek = new Date(`${query.date}T12:00:00Z`).getUTCDay();
    const dayStart = zonedDate(query.date, '00:00', tenant.timezone);
    const dayEnd = zonedDate(query.date, '23:59', tenant.timezone);
    dayEnd.setUTCSeconds(59, 999);
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        startsAt: { gte: dayStart, lte: dayEnd },
        status: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      include: { service: { select: { duration: true } } },
    });
    const slots: { time: string; staffIds: string[] }[] = [];
    for (let minute = 0; minute < 1440; minute += 30) {
      const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
      const end = minute + service.duration;
      if (zonedDate(query.date, time, tenant.timezone).getTime() <= Date.now())
        continue;
      const staffIds = staff
        .filter((member) => {
          const hours = member.hours.find(
            (item) => item.dayOfWeek === dayOfWeek,
          );
          if (
            !hours?.enabled ||
            minute < toMinutes(hours.startTime) ||
            end > toMinutes(hours.endTime)
          )
            return false;
          if (
            hours.breaks.some(
              (item) =>
                minute < toMinutes(item.endTime) &&
                end > toMinutes(item.startTime),
            )
          )
            return false;
          return !appointments.some((item) => {
            if (item.staffId !== member.id) return false;
            const start = zonedMinutes(item.startsAt, tenant.timezone);
            return minute < start + item.service.duration && end > start;
          });
        })
        .map((member) => member.id);
      if (staffIds.length) slots.push({ time, staffIds });
    }
    return slots;
  }

  async create(slug: string, dto: CreateBookingDto, user?: AuthUser) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: { in: ['ACTIVE', 'TRIAL'] } },
    });
    if (!tenant) throw new NotFoundException('Salon not found');
    const identity = user
      ? await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } })
      : null;
    const customerEmail = identity?.email ?? dto.customerEmail;
    const customerName = identity?.name ?? dto.customerName;
    const slots = await this.availability(slug, dto);
    const slot = slots.find((item) => item.time === dto.time);
    const staffId = dto.staffId === 'any' ? slot?.staffIds[0] : dto.staffId;
    if (!slot || !staffId || !slot.staffIds.includes(staffId)) {
      throw new BadRequestException('The selected time is no longer available');
    }
    return this.prisma.$transaction(
      async (tx) => {
        await this.scheduling.assertAvailable(tx, {
          tenantId: tenant.id,
          serviceId: dto.serviceId,
          staffId,
          startsAt: zonedDate(dto.date, dto.time, tenant.timezone),
          timezone: tenant.timezone,
          lockStaff: true,
        });
        const customer = await tx.customer.upsert({
          where: {
            tenantId_email: { tenantId: tenant.id, email: customerEmail },
          },
          create: {
            tenantId: tenant.id,
            name: customerName,
            email: customerEmail,
            phone: dto.customerPhone,
          },
          update: { name: customerName, phone: dto.customerPhone },
        });
        const appointment = await tx.appointment.create({
          data: {
            tenantId: tenant.id,
            customerId: customer.id,
            serviceId: dto.serviceId,
            staffId,
            startsAt: zonedDate(dto.date, dto.time, tenant.timezone),
            status: tenant.confirmation
              ? AppointmentStatus.CONFIRMED
              : AppointmentStatus.PENDING,
            notes: dto.notes,
          },
          include: { customer: true, service: true, staff: true },
        });
        const channels = [
          {
            channel: 'EMAIL' as const,
            recipient: customer.email,
          },
          ...(customer.phone
            ? [{ channel: 'SMS' as const, recipient: customer.phone }]
            : []),
        ];
        await tx.notification.createMany({
          data: channels.flatMap(({ channel, recipient }) => [
            ...(tenant.confirmation
              ? [
                  {
                    tenantId: tenant.id,
                    appointmentId: appointment.id,
                    channel,
                    recipient,
                    kind: 'BOOKING_CONFIRMATION' as const,
                    scheduledFor: new Date(),
                  },
                ]
              : []),
            ...(tenant.reminders
              ? [
                  {
                    tenantId: tenant.id,
                    appointmentId: appointment.id,
                    channel,
                    recipient,
                    kind: 'APPOINTMENT_REMINDER' as const,
                    scheduledFor: new Date(
                      appointment.startsAt.getTime() - 86_400_000,
                    ),
                  },
                ]
              : []),
          ]),
        });
        return appointment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async reschedule(
    slug: string,
    appointmentId: string,
    dto: CreateBookingDto,
    user: AuthUser,
  ) {
    const identity = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenant: { slug },
        customer: { email: identity.email },
      },
      include: { tenant: { select: { timezone: true } } },
    });
    if (!appointment)
      throw new NotFoundException('Booking not found for this account');
    if (appointment.startsAt.getTime() - Date.now() < 86_400_000)
      throw new BadRequestException(
        'Bookings can only be moved at least 24 hours before the appointment',
      );
    const slots = await this.availability(slug, dto, appointmentId);
    const slot = slots.find((item) => item.time === dto.time);
    const staffId = dto.staffId === 'any' ? slot?.staffIds[0] : dto.staffId;
    if (!slot || !staffId || !slot.staffIds.includes(staffId))
      throw new BadRequestException('The selected time is no longer available');
    const startsAt = zonedDate(dto.date, dto.time, appointment.tenant.timezone);
    return this.prisma.$transaction(
      async (tx) => {
        await this.scheduling.assertAvailable(tx, {
          tenantId: appointment.tenantId,
          serviceId: dto.serviceId,
          staffId,
          startsAt,
          timezone: appointment.tenant.timezone,
          excludeAppointmentId: appointmentId,
          lockStaff: true,
        });
        const updated = await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            serviceId: dto.serviceId,
            staffId,
            startsAt,
            notes: dto.notes,
          },
          include: { customer: true, service: true, staff: true },
        });
        await tx.notification.updateMany({
          where: {
            appointmentId,
            kind: 'APPOINTMENT_REMINDER',
            status: { in: ['QUEUED', 'FAILED'] },
          },
          data: {
            scheduledFor: new Date(startsAt.getTime() - 86_400_000),
            status: 'QUEUED',
            failureReason: null,
          },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function zonedDate(date: string, time: string, timezone: string) {
  const guess = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(guess);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const represented = Date.UTC(
    +value.year,
    +value.month - 1,
    +value.day,
    +value.hour,
    +value.minute,
    +value.second,
  );
  return new Date(guess.getTime() - (represented - guess.getTime()));
}

function zonedMinutes(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return +value.hour * 60 + +value.minute;
}
