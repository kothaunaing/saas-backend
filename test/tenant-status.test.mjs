import assert from 'node:assert/strict';
import test from 'node:test';
import { getAuthorizedTenant } from '../src/tenants/utils/tenant.utils.ts';

const prismaFor = (tenant) => ({
  tenant: { findUnique: async () => tenant },
});

test('allows active and trial tenants to use tenant APIs', async () => {
  for (const status of ['ACTIVE', 'TRIAL']) {
    const tenant = { id: 'tenant-1', slug: 'salon', status };
    assert.equal(
      await getAuthorizedTenant(prismaFor(tenant), 'salon', 'tenant-1'),
      tenant,
    );
  }
});

test('blocks pending and suspended tenants from tenant APIs', async () => {
  for (const status of ['PENDING', 'SUSPENDED']) {
    const tenant = { id: 'tenant-1', slug: 'salon', status };
    await assert.rejects(
      getAuthorizedTenant(prismaFor(tenant), 'salon', 'tenant-1'),
      (error) => error?.getStatus?.() === 403,
    );
  }
});
