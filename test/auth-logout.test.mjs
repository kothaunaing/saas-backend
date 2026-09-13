import assert from 'node:assert/strict';
import test from 'node:test';
import { portalCookieName } from '../src/auth/auth-cookies.ts';

test('tenant logout selects only the tenant session cookie', () => {
  assert.equal(portalCookieName('tenant'), 'tenant_access_token');
});

test('provider logout selects only the provider session cookie', () => {
  assert.equal(portalCookieName('provider'), 'provider_access_token');
});

test('unknown portals cannot select a session cookie', () => {
  assert.equal(portalCookieName(undefined), undefined);
  assert.equal(portalCookieName('unknown'), undefined);
});
