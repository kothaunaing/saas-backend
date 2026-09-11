import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  private async tenant(slug: string, tenantId: string | null) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!tenantId || tenant.id !== tenantId)
      throw new ForbiddenException('You cannot access this tenant');
    return tenant;
  }

  async overview(slug: string, tenantId: string | null) {
    const tenant = await this.tenant(slug, tenantId);
    const [result, availablePlans] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({
        where: { id: tenant.id },
        select: {
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              interval: true,
              features: true,
            },
          },
          paymentMethods: {
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
            select: {
              id: true,
              brand: true,
              last4: true,
              expMonth: true,
              expYear: true,
              isDefault: true,
            },
          },
          invoices: {
            orderBy: { issuedAt: 'desc' },
            take: 50,
            select: {
              id: true,
              amount: true,
              status: true,
              issuedAt: true,
              plan: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.plan.findMany({
        where: { active: true },
        orderBy: [{ price: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          price: true,
          interval: true,
          features: true,
          staffLimit: true,
        },
      }),
    ]);
    return {
      ...result,
      plan: result.plan
        ? { ...result.plan, price: Number(result.plan.price) }
        : null,
      availablePlans: availablePlans.map((plan) => ({
        ...plan,
        price: Number(plan.price),
      })),
      invoices: result.invoices.map((invoice) => ({
        ...invoice,
        amount: Number(invoice.amount),
      })),
    };
  }

  async changePlan(slug: string, tenantId: string | null, planId: string) {
    const tenant = await this.tenant(slug, tenantId);
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, active: true },
    });
    if (!plan) throw new NotFoundException('Active plan not found');
    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { planId: plan.id },
      }),
      this.prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          amount: plan.price,
          status: 'DUE',
        },
      }),
    ]);
    return this.overview(slug, tenantId);
  }

  async updatePaymentMethod(
    slug: string,
    tenantId: string | null,
    dto: { brand: string; last4: string; expMonth: number; expYear: number },
  ) {
    const tenant = await this.tenant(slug, tenantId);
    return this.prisma.$transaction(async (tx) => {
      await tx.paymentMethod.updateMany({
        where: { tenantId: tenant.id, isDefault: true },
        data: { isDefault: false },
      });
      return tx.paymentMethod.create({
        data: { tenantId: tenant.id, ...dto, isDefault: true },
        select: {
          id: true,
          brand: true,
          last4: true,
          expMonth: true,
          expYear: true,
          isDefault: true,
        },
      });
    });
  }
}
