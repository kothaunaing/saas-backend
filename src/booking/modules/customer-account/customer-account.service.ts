import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { AuthUser } from '../../../auth/auth.types';
import {
  CreateReviewDto,
  UpdateCustomerProfileDto,
} from './dto/customer-account.dto';

@Injectable()
export class CustomerAccountService {
  constructor(private readonly prisma: PrismaService) {}
  async account(user: AuthUser) {
    const identity = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    const customers = await this.prisma.customer.findMany({
      where: { email: identity.email },
      include: {
        tenant: {
          include: {
            rewards: { where: { active: true }, orderBy: { points: 'asc' } },
          },
        },
        appointments: {
          include: { tenant: true, service: true, staff: true },
          orderBy: { startsAt: 'desc' },
        },
      },
    });
    const profile = customers[0]
      ? {
          name: customers[0].name,
          email: customers[0].email,
          phone: customers[0].phone ?? '',
          notes: customers[0].notes ?? '',
        }
      : { name: identity.name, email: identity.email, phone: '', notes: '' };
    return {
      profile,
      points: customers.reduce((sum, customer) => sum + customer.points, 0),
      rewards: Array.from(
        new Map(
          customers.flatMap((customer) =>
            customer.tenant.rewards.map(
              (reward) =>
                [
                  reward.id,
                  {
                    ...reward,
                    salonId: customer.tenant.slug,
                    balance: customer.points,
                  },
                ] as const,
            ),
          ),
        ).values(),
      ),
      owned: customers.flatMap((customer) =>
        customer.appointments.map((appointment) => ({
          salonId: appointment.tenant.slug,
          appointmentId: appointment.id,
          reference: `${appointment.tenant.slug.slice(0, 3).toUpperCase()}-${appointment.id.slice(0, 8).toUpperCase()}`,
          contact: profile,
          appointment: {
            id: appointment.id,
            customerId: customer.id,
            serviceId: appointment.serviceId,
            staffId: appointment.staffId,
            date: localParts(appointment.startsAt, appointment.tenant.timezone)
              .date,
            time: localParts(appointment.startsAt, appointment.tenant.timezone)
              .time,
            status: title(appointment.status),
            notes: appointment.notes ?? '',
          },
        })),
      ),
    };
  }
  async updateProfile(user: AuthUser, dto: UpdateCustomerProfileDto) {
    const identity = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    const email = dto.email.toLowerCase();
    await this.prisma.$transaction([
      this.prisma.customer.updateMany({
        where: { email: identity.email },
        data: { ...dto, email },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { name: dto.name, email },
      }),
    ]);
    return { ...dto, email };
  }
  async cancel(user: AuthUser, appointmentId: string) {
    const identity = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, customer: { email: identity.email } },
    });
    if (!appointment)
      throw new ForbiddenException('Booking does not belong to this account');
    if (appointment.startsAt.getTime() - Date.now() < 86_400_000)
      throw new BadRequestException(
        'Online cancellation closes 24 hours before the appointment',
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({
        where: { appointmentId, status: { in: ['QUEUED', 'FAILED'] } },
      });
      return tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' },
      });
    });
  }
  async review(user: AuthUser, dto: CreateReviewDto) {
    const identity = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: dto.appointmentId,
        status: 'COMPLETED',
        customer: { email: identity.email },
      },
      include: { customer: true },
    });
    if (!appointment)
      throw new BadRequestException(
        'Only completed appointments can be reviewed',
      );
    const existing = await this.prisma.review.findUnique({
      where: { appointmentId: appointment.id },
    });
    if (existing)
      throw new BadRequestException('This visit was already reviewed');
    return this.prisma.review.create({
      data: {
        tenantId: appointment.tenantId,
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        serviceId: appointment.serviceId,
        staffId: appointment.staffId,
        authorName: appointment.customer.name,
        rating: dto.rating,
        text: dto.text,
      },
    });
  }
}
function title(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
    .replace('No show', 'No-show');
}

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    time: `${value.hour}:${value.minute}`,
  };
}
