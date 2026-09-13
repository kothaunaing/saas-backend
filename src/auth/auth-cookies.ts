const COOKIE_BY_PORTAL: Record<string, string> = {
  customer: 'customer_access_token',
  tenant: 'tenant_access_token',
  provider: 'provider_access_token',
};

export function portalCookieName(portal: string | undefined) {
  return portal ? COOKIE_BY_PORTAL[portal] : undefined;
}
