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
  console.log('--- Step 1: Login as Tenant Admin ---');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'owner@serenity.com',
      password: 'password123',
    }),
  });
  assert.equal(loginRes.status, 201, 'Login must succeed');
  assert.equal(loginRes.data.user.role, 'TENANT_ADMIN');
  console.log('✓ Logged in successfully:', loginRes.data.user.email);

  console.log('\n--- Step 2: Test Customers Endpoints ---');
  // List with pagination
  const custRes = await request('/tenants/serenity/customers?page=1&size=2');
  assert.equal(custRes.status, 200);
  assert.equal(custRes.data.data.length, 2);
  assert.equal(custRes.data.meta.page, 1);
  assert.equal(custRes.data.meta.size, 2);
  console.log(`✓ Customers pagination: page 1 of ${custRes.data.meta.totalPages} (total ${custRes.data.meta.total})`);

  // Search
  const searchCust = await request('/tenants/serenity/customers?search=Ei');
  assert.equal(searchCust.status, 200);
  assert.ok(searchCust.data.data.length >= 1);
  assert.ok(searchCust.data.data[0].name.includes('Ei'));
  console.log(`✓ Customers search: found ${searchCust.data.data.length} match(es) for 'Ei'`);

  // CRUD
  const newCust = await request('/tenants/serenity/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Automated Test Client',
      email: 'auto.client@example.com',
      phone: '+95 9 111 222 333',
      points: 250,
      notes: 'Created via automated test suite',
    }),
  });
  assert.equal(newCust.status, 201);
  const custId = newCust.data.id;
  console.log('✓ Created customer:', custId);

  const updateCust = await request(`/tenants/serenity/customers/${custId}`, {
    method: 'PATCH',
    body: JSON.stringify({ notes: 'Updated notes from test suite' }),
  });
  assert.equal(updateCust.status, 200);
  assert.equal(updateCust.data.notes, 'Updated notes from test suite');
  console.log('✓ Updated customer:', custId);

  const delCust = await request(`/tenants/serenity/customers/${custId}`, {
    method: 'DELETE',
  });
  assert.equal(delCust.status, 200);
  assert.equal(delCust.data.success, true);
  console.log('✓ Deleted customer:', custId);

  console.log('\n--- Step 3: Test Services Endpoints ---');
  // List with pagination & category
  const srvRes = await request('/tenants/serenity/services?category=Massage');
  assert.equal(srvRes.status, 200);
  assert.ok(srvRes.data.data.length >= 1);
  assert.equal(srvRes.data.data[0].category, 'Massage');
  console.log(`✓ Services category filter: ${srvRes.data.data.length} massage service(s) found`);

  // Search
  const srvSearch = await request('/tenants/serenity/services?search=Facial');
  assert.equal(srvSearch.status, 200);
  assert.ok(srvSearch.data.data.length >= 1);
  console.log(`✓ Services search: found ${srvSearch.data.data.length} match(es) for 'Facial'`);

  // CRUD
  const newSrv = await request('/tenants/serenity/services', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Deluxe Hot Stone Massage',
      category: 'Massage',
      duration: 90,
      price: 120,
      description: 'Relaxing hot stone massage',
    }),
  });
  assert.equal(newSrv.status, 201);
  const srvId = newSrv.data.id;
  console.log('✓ Created service:', srvId);

  const delSrv = await request(`/tenants/serenity/services/${srvId}`, {
    method: 'DELETE',
  });
  assert.equal(delSrv.status, 200);
  console.log('✓ Deleted service:', srvId);

  console.log('\n--- Step 4: Test Staff Endpoints ---');
  const staffRes = await request('/tenants/serenity/staff?page=1&size=2');
  assert.equal(staffRes.status, 200);
  assert.equal(staffRes.data.data.length, 2);
  assert.ok(Array.isArray(staffRes.data.data[0].hours));
  console.log(`✓ Staff pagination: page 1 of ${staffRes.data.meta.totalPages} (total ${staffRes.data.meta.total})`);

  const staffSearch = await request('/tenants/serenity/staff?search=Hnin');
  assert.equal(staffSearch.status, 200);
  assert.ok(staffSearch.data.data.length >= 1);
  console.log(`✓ Staff search: found ${staffSearch.data.data.length} match(es) for 'Hnin'`);

  console.log('\n--- Step 5: Test Appointments Endpoints ---');
  const apptRes = await request('/tenants/serenity/appointments?page=1&size=5');
  assert.equal(apptRes.status, 200);
  assert.ok(apptRes.data.data.length >= 1);
  assert.ok(apptRes.data.data[0].date);
  assert.ok(apptRes.data.data[0].time);
  console.log(`✓ Appointments list: ${apptRes.data.data.length} appointments returned with formatted schedule`);

  console.log('\n--- Step 6: Test Rewards Endpoints ---');
  const rewRes = await request('/tenants/serenity/rewards?page=1&size=2');
  assert.equal(rewRes.status, 200);
  assert.equal(rewRes.data.data.length, 2);
  console.log(`✓ Rewards pagination: page 1 of ${rewRes.data.meta.totalPages} (total ${rewRes.data.meta.total})`);

  // CRUD
  const newRew = await request('/tenants/serenity/rewards', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Free Herbal Tea Set',
      points: 300,
      description: 'Complimentary tea set gift box',
    }),
  });
  assert.equal(newRew.status, 201);
  const rewId = newRew.data.id;
  console.log('✓ Created reward:', rewId);

  const delRew = await request(`/tenants/serenity/rewards/${rewId}`, {
    method: 'DELETE',
  });
  assert.equal(delRew.status, 200);
  console.log('✓ Deleted reward:', rewId);

  console.log('\n=============================================');
  console.log('ALL ISOLATED ENDPOINTS & SEARCH/PAGINATION PASSED!');
  console.log('=============================================');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
