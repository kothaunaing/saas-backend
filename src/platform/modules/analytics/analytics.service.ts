import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';

export interface DashboardMetrics {
  activeTenants: number;
  totalTenants: number;
  bookings: number;
  openTickets: number;
  collected: number;
  mrr: number;
  planDistribution: Array<{
    name: string;
    count: number;
  }>;
  recentTenants: Array<{
    id: string;
    name: string;
    owner: string;
    city: string;
    plan: string;
    status: string;
    joined: string;
  }>;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(): Promise<DashboardMetrics> {
    const [
      activeTenants,
      totalTenants,
      bookings,
      collected,
      openTickets,
      activePlans,
      allPlans,
      recentTenants,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenant.count(),
      this.prisma.appointment.count(),
      this.prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.ticket.count({ where: { status: { not: 'RESOLVED' } } }),
      this.prisma.tenant.findMany({
        where: { status: 'ACTIVE' },
        select: { plan: { select: { price: true } } },
      }),
      this.prisma.plan.findMany({
        include: { _count: { select: { tenants: true } } },
        orderBy: { price: 'asc' },
      }),
      this.prisma.tenant.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      }),
    ]);

    const mrr = activePlans.reduce(
      (sum, item) => sum + Number(item.plan?.price ?? 0),
      0,
    );

    return {
      activeTenants,
      totalTenants,
      bookings,
      openTickets,
      collected: Number(collected._sum.amount ?? 0),
      mrr,
      planDistribution: allPlans.map((p) => ({
        name: p.name,
        count: p._count.tenants,
      })),
      recentTenants: recentTenants.map((t) => ({
        id: t.id,
        name: t.name,
        owner: t.ownerName,
        city: t.city ?? '',
        plan: t.plan?.name ?? 'No Plan',
        status: t.status,
        joined: t.createdAt.toISOString().slice(0, 10),
      })),
    };
  }
}
