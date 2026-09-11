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

/**
 * Extract the JWT from whichever role-scoped cookie is appropriate.
 *
 * Browsers share cookies across different ports on `localhost`. When a user has
 * active sessions across Customer, Tenant, and Provider apps simultaneously,
 * multiple role cookies may be present in `request.headers.cookie`.
 *
 * To prevent session bleeding, we prioritize the cookie matching the requesting portal:
 * 1. `x-serenity-portal` header ('tenant' | 'provider' | 'customer')
 * 2. Origin / Referer / Forwarded host port context (:3000 -> tenant, :3002 -> provider, :3001 -> customer)
 * 3. Request URL path context (/api/tenant... -> tenant, /api/platform... -> provider, /api/customer... -> customer)
 * 4. Fallback order
 */
const cookieToken = (request: {
  headers?: {
    cookie?: string;
    'x-serenity-portal'?: string;
    origin?: string;
    referer?: string;
    'x-forwarded-host'?: string;
  };
  url?: string;
}) => {
  const cookie = request.headers?.cookie;
  if (!cookie) return null;
  const parts = cookie.split(';').map((v) => v.trim());

  const getCookie = (name: string) => {
    const entry = parts.find((v) => v.startsWith(`${name}=`));
    return entry
      ? decodeURIComponent(entry.slice(entry.indexOf('=') + 1))
      : null;
  };

  // 1. Explicit portal header set by frontend clients
  const portal = request.headers?.['x-serenity-portal'];
  if (portal === 'tenant') {
    const token = getCookie('tenant_access_token');
    if (token) return token;
  } else if (portal === 'provider') {
    const token = getCookie('provider_access_token');
    if (token) return token;
  } else if (portal === 'customer') {
    const token = getCookie('customer_access_token');
    if (token) return token;
  }

  // 2. Origin, Referer, or Forwarded-Host port clues
  const clientContext =
    (request.headers?.referer ?? '') +
    (request.headers?.origin ?? '') +
    (request.headers?.['x-forwarded-host'] ?? '');

  if (clientContext.includes(':3000')) {
    const token = getCookie('tenant_access_token');
    if (token) return token;
  }
  if (clientContext.includes(':3002')) {
    const token = getCookie('provider_access_token');
    if (token) return token;
  }
  if (clientContext.includes(':3001')) {
    const token = getCookie('customer_access_token');
    if (token) return token;
  }

  // 3. API endpoint path heuristics
  const url = request.url ?? '';
  if (
    url.includes('/api/tenant') ||
    url.includes('/api/appointments') ||
    url.includes('/api/services') ||
    url.includes('/api/staff')
  ) {
    const token = getCookie('tenant_access_token');
    if (token) return token;
  }
  if (url.includes('/api/platform') || url.includes('/api/provider')) {
    const token = getCookie('provider_access_token');
    if (token) return token;
  }
  if (url.includes('/api/customer')) {
    const token = getCookie('customer_access_token');
    if (token) return token;
  }

  // 4. Default fallback order
  return (
    getCookie('tenant_access_token') ??
    getCookie('provider_access_token') ??
    getCookie('customer_access_token')
  );
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
