import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from './auth.types';

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
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieToken,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }
  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      customerId: payload.customerId,
    };
  }
}
