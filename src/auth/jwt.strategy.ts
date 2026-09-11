import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from './auth.types';
import { PrismaService } from '../database/prisma/prisma.service';

const cookieToken = (request: { headers?: { cookie?: string } }) => {
  const cookie = request.headers?.cookie;
  if (!cookie) return null;
  const entry = cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith('customer_access_token='));
  return entry ? decodeURIComponent(entry.slice(entry.indexOf('=') + 1)) : null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieToken,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        customerId: true,
        tenant: { select: { status: true } },
      },
    });
    if (!user) throw new UnauthorizedException('Account no longer exists');
    if (
      user.tenant &&
      user.tenant.status !== 'ACTIVE' &&
      user.tenant.status !== 'TRIAL'
    ) {
      throw new ForbiddenException('Tenant account is not active');
    }
    if (user.role !== 'PLATFORM_ADMIN') {
      const settings = await this.prisma.platformSettings.findUnique({
        where: { id: 1 },
        select: { maintenanceMode: true },
      });
      if (settings?.maintenanceMode)
        throw new ForbiddenException(
          'The platform is temporarily under maintenance',
        );
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      customerId: user.customerId,
    };
  }
}
