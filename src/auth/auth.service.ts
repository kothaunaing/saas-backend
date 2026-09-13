import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { TenantStatus, UserRole } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}
  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenant: { select: { slug: true, status: true } } },
    });
    if (!user || !(await compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException('Invalid email or password');
    if (user.tenant?.status === TenantStatus.PENDING)
      throw new ForbiddenException(
        'Your business registration is awaiting provider approval',
      );
    if (user.tenant?.status === TenantStatus.SUSPENDED)
      throw new ForbiddenException('Your business account is suspended');
    const profile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      customerId: user.customerId,
      tenantSlug: user.tenant?.slug ?? null,
    };
    return {
      accessToken: await this.jwt.signAsync({
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        customerId: user.customerId,
      }),
      user: profile,
    };
  }

  async registrationPlans() {
    const plans = await this.prisma.plan.findMany({
      where: { active: true },
      orderBy: [{ price: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        price: true,
        interval: true,
        staffLimit: true,
        features: true,
      },
    });
    return plans.map((plan) => ({ ...plan, price: Number(plan.price) }));
  }

  async registerCustomer(dto: RegisterCustomerDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } }))
      throw new ConflictException('An account with this email already exists');
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash: await hash(dto.password, 12),
        role: UserRole.CUSTOMER,
      },
      select: { id: true, email: true, name: true, role: true },
    });
    return { user };
  }

  async registerTenant(dto: RegisterTenantDto) {
    const email = dto.email.trim().toLowerCase();
    const [user, tenant, trialPlan, requestedPlan] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.tenant.findFirst({
        where: { OR: [{ email }, { slug: dto.slug }] },
      }),
      this.prisma.plan.findFirst({ where: { name: 'Trial', active: true } }),
      dto.planId
        ? this.prisma.plan.findFirst({ where: { id: dto.planId, active: true } })
        : null,
    ]);
    if (user || tenant)
      throw new ConflictException(
        'This email or business slug is already registered',
      );
    const plan = requestedPlan ?? trialPlan;
    if (!plan) throw new NotFoundException('Selected plan is not available');
    const isTrial = plan.name.toLowerCase() === 'trial';
    const status = isTrial ? TenantStatus.TRIAL : TenantStatus.ACTIVE;
    const passwordHash = await hash(dto.password, 12);
    const created = await this.prisma.$transaction(async (tx) => {
      const business = await tx.tenant.create({
        data: {
          name: dto.businessName.trim(),
          ownerName: dto.ownerName.trim(),
          slug: dto.slug,
          email,
          phone: dto.phone,
          address: dto.address,
          city: dto.city,
          planId: plan.id,
          status,
        },
      });
      await tx.user.create({
        data: {
          email,
          name: dto.ownerName.trim(),
          passwordHash,
          role: UserRole.TENANT_ADMIN,
          tenantId: business.id,
        },
      });
      return business;
    });
    return {
      id: created.id,
      slug: created.slug,
      status: created.status,
      message: `${plan.name} workspace created`,
    };
  }
  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        customerId: true,
        tenant: { select: { slug: true } },
      },
    });
    if (!user) throw new UnauthorizedException();
    return {
      ...user,
      tenantSlug: user.tenant?.slug ?? null,
      tenant: undefined,
    };
  }
}
