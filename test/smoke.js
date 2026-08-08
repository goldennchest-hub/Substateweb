process.env.JWT_SECRET = 'test_secret_for_smoke_test_only';
process.env.ADMIN_KEY = 'test_admin_key_123';

const assert = require('assert');
const { installFakes } = require('./mockModels');

installFakes(); // must happen BEFORE requiring server.js/routes so the patched model methods are in place

const request = require('supertest');
const { app } = require('../server');

async function run() {
  console.log('--- Health check ---');
  let res = await request(app).get('/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.ok, true);
  console.log('OK: /api/health');

  console.log('--- Signup ---');
  res = await request(app).post('/api/auth/signup').send({
    name: 'Golden Khanal', email: 'Golden@Example.com', phone: '9800000000', password: 'secret123'
  });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  assert.ok(res.body.token);
  assert.strictEqual(res.body.user.email, 'golden@example.com');
  const token = res.body.token;
  console.log('OK: signup returns token + user, email normalized to lowercase');

  console.log('--- Duplicate signup rejected ---');
  res = await request(app).post('/api/auth/signup').send({
    name: 'Dup', email: 'golden@example.com', phone: '111', password: 'secret123'
  });
  assert.strictEqual(res.status, 409, JSON.stringify(res.body));
  console.log('OK: duplicate email rejected with 409');

  console.log('--- Weak password rejected ---');
  res = await request(app).post('/api/auth/signup').send({
    name: 'X', email: 'weak@example.com', phone: '111', password: '123'
  });
  assert.strictEqual(res.status, 400);
  console.log('OK: short password rejected with 400');

  console.log('--- Login with wrong password ---');
  res = await request(app).post('/api/auth/login').send({
    email: 'golden@example.com', password: 'wrongpass'
  });
  assert.strictEqual(res.status, 401, JSON.stringify(res.body));
  console.log('OK: wrong password rejected with 401');

  console.log('--- Login with correct password ---');
  res = await request(app).post('/api/auth/login').send({
    email: 'golden@example.com', password: 'secret123'
  });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.token);
  console.log('OK: correct login returns token');

  console.log('--- /api/auth/me requires auth ---');
  res = await request(app).get('/api/auth/me');
  assert.strictEqual(res.status, 401);
  res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(res.body.user.email, 'golden@example.com');
  console.log('OK: /me blocked without token, works with valid token');

  console.log('--- Create listing (guest, no auth) ---');
  res = await request(app).post('/api/listings').send({
    title: 'Test plot', type: 'land', district: 'Kaski', city: 'Pokhara',
    price: 1000000, areaSqft: 500, sellerName: 'Guest Seller', sellerPhone: '9800011111'
  });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  assert.strictEqual(res.body.listing.sellerEmail, null);
  console.log('OK: guest can post a listing, sellerEmail is null');

  console.log('--- Create listing (logged in) ---');
  res = await request(app).post('/api/listings')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Logged-in plot', type: 'house', district: 'Kathmandu', city: 'Kathmandu',
      price: 5000000, areaSqft: 1200, sellerName: 'Golden Khanal', sellerPhone: '9800000000'
    });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  assert.strictEqual(res.body.listing.sellerEmail, 'golden@example.com');
  console.log('OK: logged-in listing is tagged with sellerEmail');

  console.log('--- Missing required field rejected ---');
  res = await request(app).post('/api/listings').send({ title: 'Incomplete' });
  assert.strictEqual(res.status, 400);
  console.log('OK: incomplete listing rejected with 400');

  console.log('--- List + filter listings ---');
  res = await request(app).get('/api/listings');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.listings.length, 2);
  console.log('OK: GET /api/listings returns both created listings');

  res = await request(app).get('/api/listings?type=house');
  assert.strictEqual(res.body.listings.length, 1);
  assert.strictEqual(res.body.listings[0].type, 'house');
  console.log('OK: type filter works');

  res = await request(app).get('/api/listings?district=Kaski');
  assert.strictEqual(res.body.listings.length, 1);
  console.log('OK: district filter (regex, case-insensitive) works');

  res = await request(app).get('/api/listings?minPrice=2000000');
  assert.strictEqual(res.body.listings.length, 1);
  assert.strictEqual(res.body.listings[0].title, 'Logged-in plot');
  console.log('OK: minPrice filter works');

  console.log('--- Admin views require the admin key ---');
  res = await request(app).get('/api/admin/users');
  assert.strictEqual(res.status, 401, JSON.stringify(res.body));
  console.log('OK: admin route blocked with no key');

  res = await request(app).get('/api/admin/users').set('x-admin-key', 'wrong-key');
  assert.strictEqual(res.status, 401);
  console.log('OK: admin route blocked with wrong key');

  res = await request(app).get('/api/admin/users').set('x-admin-key', process.env.ADMIN_KEY);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.users.length, 1);
  assert.strictEqual(res.body.users[0].passwordHash, undefined);
  console.log('OK: admin users list works with correct key, excludes passwordHash');

  res = await request(app).get('/api/admin/logins').set('x-admin-key', process.env.ADMIN_KEY);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.logins.length, 2); // signup + login both log
  console.log('OK: admin login log has 2 entries (signup + login)');

  console.log('\nALL SMOKE TESTS PASSED');
}

run().catch(err => {
  console.error('\nSMOKE TEST FAILED:', err);
  process.exit(1);
});
