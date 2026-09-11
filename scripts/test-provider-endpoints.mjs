import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:4010/api';
let cookie = '';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(cookie ? { Cookie: cookie } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    cookie = setCookie.split(';')[0];
  }
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, data: json };
}

async function run() {
  console.log('--- Step 1: Login as Platform Admin ---');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@serenity.cloud',
      password: 'password123',
    }),
  });
  assert.equal(loginRes.status, 201, 'Login must succeed');
  assert.equal(loginRes.data.user.role, 'PLATFORM_ADMIN');
  console.log('✓ Logged in as:', loginRes.data.user.email);

  console.log('\n--- Step 2: Test Platform Dashboard Analytics ---');
  const dashRes = await request('/platform/dashboard');
  assert.equal(dashRes.status, 200);
  assert.ok(typeof dashRes.data.activeTenants === 'number');
  assert.ok(typeof dashRes.data.mrr === 'number');
  assert.ok(typeof dashRes.data.bookings === 'number');
  assert.ok(Array.isArray(dashRes.data.planDistribution));
  console.log(`✓ Analytics: activeTenants=${dashRes.data.activeTenants}, MRR=$${dashRes.data.mrr}, totalBookings=${dashRes.data.bookings}`);

  console.log('\n--- Step 3: Test Platform Tenants ---');
  const tenantsRes = await request('/platform/tenants?page=1&size=2');
  assert.equal(tenantsRes.status, 200);
  assert.equal(tenantsRes.data.data.length, 2);
  assert.equal(tenantsRes.data.meta.page, 1);
  console.log(`✓ Tenants pagination: page 1 of ${tenantsRes.data.meta.totalPages} (total ${tenantsRes.data.meta.total})`);

  // Search
  const searchTenant = await request('/platform/tenants?search=Serenity');
  assert.equal(searchTenant.status, 200);
  assert.ok(searchTenant.data.data.length >= 1);
  console.log(`✓ Tenant search: found ${searchTenant.data.data.length} match(es) for 'Serenity'`);

  // Status Filter
  const activeTenants = await request('/platform/tenants?status=ACTIVE');
  assert.equal(activeTenants.status, 200);
  console.log(`✓ Active tenants filter: ${activeTenants.data.data.length} active tenant(s)`);

  console.log('\n--- Step 4: Test Platform Plans ---');
  const plansRes = await request('/platform/plans?page=1&size=5');
  assert.equal(plansRes.status, 200);
  assert.ok(plansRes.data.data.length >= 1);
  console.log(`✓ Plans list: ${plansRes.data.data.length} plan tier(s) found`);

  // Create plan
  const newPlan = await request('/platform/plans', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Enterprise Plus',
      price: 199.0,
      interval: 'month',
      tenantLimit: 10,
      staffLimit: 50,
      features: ['Dedicated Account Manager', 'Custom SMS Gateway', 'Multi-Branch Sync'],
      active: true,
    }),
  });
  assert.equal(newPlan.status, 201);
  const planId = newPlan.data.id;
  console.log('✓ Created plan:', newPlan.data.name, `($${newPlan.data.price}/mo)`);

  const delPlan = await request(`/platform/plans/${planId}`, {
    method: 'DELETE',
  });
  assert.equal(delPlan.status, 200);
  console.log('✓ Deleted test plan tier:', planId);

  console.log('\n--- Step 5: Test Platform Invoices ---');
  const invRes = await request('/platform/invoices?page=1&size=2');
  assert.equal(invRes.status, 200);
  assert.ok(Array.isArray(invRes.data.data));
  console.log(`✓ Invoices pagination: page 1 of ${invRes.data.meta.totalPages} (total ${invRes.data.meta.total})`);

  console.log('\n--- Step 6: Test Platform Tickets ---');
  const tickRes = await request('/platform/tickets?page=1&size=5');
  assert.equal(tickRes.status, 200);
  assert.ok(Array.isArray(tickRes.data.data));
  console.log(`✓ Tickets list: ${tickRes.data.data.length} ticket(s) found`);

  console.log('\n--- Step 7: Test Platform Settings ---');
  const settRes = await request('/platform/settings');
  assert.equal(settRes.status, 200);
  assert.ok(settRes.data.platformName);
  console.log('✓ Platform settings retrieved:', settRes.data.platformName, `(${settRes.data.supportEmail})`);

  const updateSett = await request('/platform/settings', {
    method: 'PUT',
    body: JSON.stringify({
      platformName: settRes.data.platformName,
      supportEmail: settRes.data.supportEmail,
      trialDays: settRes.data.trialDays,
      tenantApproval: settRes.data.tenantApproval,
      maintenanceMode: false,
      incidentEmails: true,
      billingEmails: true,
    }),
  });
  assert.equal(updateSett.status, 200);
  console.log('✓ Platform settings updated successfully');

  console.log('\n=============================================');
  console.log('ALL PROVIDER PLATFORM ENDPOINTS PASSED!');
  console.log('=============================================');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
