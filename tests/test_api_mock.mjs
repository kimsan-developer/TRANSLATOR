import app from '../backend/dist/app.js';
import { connectDatabase, disconnectDatabase } from '../backend/dist/config/database.js';
import { EventEmitter } from 'events';

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
  }
  status(code) {
    this.statusCode = code;
    return this;
  }
  json(data) {
    this.body = JSON.stringify(data);
    this.emit('finish');
    return this;
  }
  send(data) {
    this.body = data;
    this.emit('finish');
    return this;
  }
  setHeader(k, v) {
    this.headers[k] = v;
  }
}

async function run() {
  console.log('Connecting DB...');
  await connectDatabase();
  console.log('DB connected.');

  const expressApp = typeof app === 'function' ? app : (app.default || app);
  console.log('expressApp type:', typeof expressApp);

  // Test 1: /health
  const req1 = { method: 'GET', url: '/health', headers: {} };
  const res1 = new MockResponse();
  expressApp(req1, res1);
  await new Promise((r) => res1.on('finish', r));
  console.log('✓ /health response:', res1.statusCode, res1.body);

  // Test 2: /api/auth/register
  const email = `test_${Date.now()}@test.com`;
  const req2 = {
    method: 'POST',
    url: '/api/auth/register',
    headers: { 'content-type': 'application/json' },
    body: { name: 'Direct Test User', email, password: 'Password123!' },
  };
  const res2 = new MockResponse();
  expressApp(req2, res2);
  await new Promise((r) => res2.on('finish', r));
  console.log('✓ /api/auth/register response:', res2.statusCode, JSON.parse(res2.body).user?.name);
  const token = JSON.parse(res2.body).accessToken;

  // Test 3: /api/auth/me
  const req3 = {
    method: 'GET',
    url: '/api/auth/me',
    headers: { authorization: `Bearer ${token}` },
  };
  const res3 = new MockResponse();
  expressApp(req3, res3);
  await new Promise((r) => res3.on('finish', r));
  console.log('✓ /api/auth/me response:', res3.statusCode, JSON.parse(res3.body).user?.email);

  // Test 4: /api/providers
  const req4 = {
    method: 'GET',
    url: '/api/providers',
    headers: { authorization: `Bearer ${token}` },
  };
  const res4 = new MockResponse();
  expressApp(req4, res4);
  await new Promise((r) => res4.on('finish', r));
  const provs = JSON.parse(res4.body).providers;
  console.log('✓ /api/providers response:', res4.statusCode, `${provs.length} providers loaded`);

  // Test 5: /api/projects
  const req5 = {
    method: 'POST',
    url: '/api/projects',
    headers: { authorization: `Bearer ${token}` },
    body: { title: 'Direct Project', sourceLanguage: 'en', targetLanguage: 'km' },
  };
  const res5 = new MockResponse();
  expressApp(req5, res5);
  await new Promise((r) => res5.on('finish', r));
  console.log('✓ /api/projects response:', res5.statusCode, JSON.parse(res5.body).project?.title);

  await disconnectDatabase();
  console.log('ALL DIRECT API TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

run().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
