import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { PrismaService } from '../database/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

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
      include: { tenant: { select: { slug: true } } },
    });
    if (!user || !(await compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException('Invalid email or password');
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
