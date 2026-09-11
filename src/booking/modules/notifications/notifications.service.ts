import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { AuthUser } from '../../../auth/auth.types';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async customerNotifications(user: AuthUser) {
    const identity = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { email: true },
    });
    return this.prisma.notification.findMany({
      where: { appointment: { customer: { email: identity.email } } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        kind: true,
        channel: true,
        status: true,
        scheduledFor: true,
        sentAt: true,
        appointment: {
          select: {
            startsAt: true,
            service: { select: { name: true } },
            tenant: { select: { name: true, slug: true } },
          },
        },
      },
    });
  }

  async tenantNotifications(slug: string, tenantId: string | null) {
    const tenant = await this.authorize(slug, tenantId);
    return this.prisma.notification.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        kind: true,
        channel: true,
        recipient: true,
        status: true,
        scheduledFor: true,
        sentAt: true,
        failureReason: true,
      },
    });
  }

  async dispatch(slug: string, tenantId: string | null) {
    const tenant = await this.authorize(slug, tenantId);
    const due = await this.prisma.notification.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ['QUEUED', 'FAILED'] },
        scheduledFor: { lte: new Date() },
      },
      take: 100,
      include: {
        appointment: {
          include: { tenant: true, service: true, staff: true, customer: true },
        },
      },
    });
    const webhook = this.config.get<string>('NOTIFICATION_WEBHOOK_URL');
    if (!webhook)
      return {
        attempted: 0,
        sent: 0,
        queued: due.length,
        configurationRequired: 'NOTIFICATION_WEBHOOK_URL',
      };
    let sent = 0;
    for (const item of due) {
      try {
        const response = await fetch(webhook, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            channel: item.channel,
            kind: item.kind,
            recipient: item.recipient,
            salon: item.appointment.tenant.name,
            customer: item.appointment.customer.name,
            service: item.appointment.service.name,
            staff: item.appointment.staff.name,
            startsAt: item.appointment.startsAt,
          }),
        });
        if (!response.ok)
          throw new Error(`Delivery provider returned ${response.status}`);
        await this.prisma.notification.update({
          where: { id: item.id },
          data: { status: 'SENT', sentAt: new Date(), failureReason: null },
        });
        sent += 1;
      } catch (error) {
        await this.prisma.notification.update({
          where: { id: item.id },
          data: {
            status: 'FAILED',
            failureReason:
              error instanceof Error
                ? error.message.slice(0, 500)
                : 'Delivery failed',
          },
        });
      }
    }
    return { attempted: due.length, sent, failed: due.length - sent };
  }

  private async authorize(slug: string, tenantId: string | null) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!tenantId || tenant.id !== tenantId)
      throw new ForbiddenException('You cannot access this tenant');
    return tenant;
  }
}
