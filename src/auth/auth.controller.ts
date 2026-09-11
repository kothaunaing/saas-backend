import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './decorators/current-user/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';

/**
 * Cookie names are scoped by role so that logging in on one frontend
 * (customer / tenant / provider) does not bleed a session into the others,
 * even though all three run on localhost with different ports.
 *
 * Browsers treat different ports as the same "site" for cookie purposes,
 * so the only reliable isolation mechanism is using distinct cookie names.
 */
const COOKIE_BY_ROLE: Record<string, string> = {
  CUSTOMER: 'customer_access_token',
  TENANT_ADMIN: 'tenant_access_token',
  PLATFORM_ADMIN: 'provider_access_token',
};

/** Shared cookie options. */
function cookieOptions(maxAge = 7 * 24 * 60 * 60 * 1000) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  };
}

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(dto);
    const cookieName = COOKIE_BY_ROLE[session.user.role] ?? 'customer_access_token';
    response.cookie(cookieName, session.accessToken, cookieOptions());
    return { user: session.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    // Clear all role cookies on logout so a single logout signs out everywhere.
    const clearOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
    response.clearCookie('customer_access_token', clearOpts);
    response.clearCookie('tenant_access_token', clearOpts);
    response.clearCookie('provider_access_token', clearOpts);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthUser) {
    return this.authService.profile(user.id);
  }
}
