import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../backend/dist/app.js';
import { connectDatabase, disconnectDatabase } from '../backend/dist/config/database.js';

describe('API Server Integration Tests', () => {
  let server;
  let baseUrl = '';

  before(async () => {
    await connectDatabase();
    const expressApp = typeof app === 'function' ? app : (app.default || app);
    server = http.createServer(expressApp);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((r) => server.close(r));
    }
    await disconnectDatabase();
    setTimeout(() => process.exit(0), 100);
  });

  test('Health Check returns healthy status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
  });

  test('User Registration, Login & JWT Auth Verification', async () => {
    const testEmail = `test_${Date.now()}@test.com`;
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Integration Tester',
        email: testEmail,
        password: 'Password123!',
      }),
    });

    assert.equal(registerRes.status, 201);
    const regData = await registerRes.json();
    assert.ok(regData.accessToken);
    assert.equal(regData.user.email, testEmail);

    // Authenticated call to /me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${regData.accessToken}` },
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.user.email, testEmail);

    // Create project
    const projectRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData.accessToken}`,
      },
      body: JSON.stringify({
        title: 'Automated Test Dubbing Project',
        sourceLanguage: 'en',
        targetLanguage: 'km',
      }),
    });

    assert.equal(projectRes.status, 201);
    const projData = await projectRes.json();
    assert.equal(projData.project.title, 'Automated Test Dubbing Project');
    assert.equal(projData.project.targetLanguage, 'km');
  });

  test('Provider Listing and Seed Data Verification', async () => {
    // Login as admin
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@videotranslator.ai',
        password: 'Admin@123456',
      }),
    });

    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();

    const provRes = await fetch(`${baseUrl}/api/providers`, {
      headers: { Authorization: `Bearer ${loginData.accessToken}` },
    });
    assert.equal(provRes.status, 200);
    const provData = await provRes.json();
    assert.ok(Array.isArray(provData.providers));
    assert.ok(provData.providers.some((p) => p.type === 'whisper'));
    assert.ok(provData.providers.some((p) => p.type === 'edge-tts'));
  });
});
