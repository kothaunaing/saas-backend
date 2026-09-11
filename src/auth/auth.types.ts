import { UserRole } from '../generated/prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  customerId: string | null;
};
export type JwtPayload = Pick<
  AuthUser,
  'email' | 'role' | 'tenantId' | 'customerId'
> & { sub: string };
