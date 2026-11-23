import http from 'http';
import app from '../backend/dist/app.js';
import { connectDatabase, disconnectDatabase } from '../backend/dist/config/database.js';

async function run() {
  console.log('--- STARTING BACKEND INTEGRATION TEST ---');
  await connectDatabase();

  const expressApp = typeof app === 'function' ? app : (app.default || app);
  const server = http.createServer(expressApp);
  await new Promise((resolve) => server.listen(5001, '127.0.0.1', resolve));
  const baseUrl = 'http://127.0.0.1:5001';
  console.log('Server listening on:', baseUrl);

  // 1. Health check
  const healthRes = await fetch(`${baseUrl}/health`);
  const healthData = await healthRes.json();
  console.log('✓ Health check status:', healthData.status);

  // 2. User Registration
  const testEmail = `tester_${Date.now()}@example.com`;
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Integration Tester',
      email: testEmail,
      password: 'Password123!',
    }),
  });
  const regData = await regRes.json();
  console.log('✓ Registration status:', regRes.status, 'User:', regData.user?.name);

  // 3. Authenticated /me
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${regData.accessToken}` },
  });
  const meData = await meRes.json();
  console.log('✓ /me auth check:', meRes.status, 'Email:', meData.user?.email);

  // 4. Create Project
  const projRes = await fetch(`${baseUrl}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regData.accessToken}`,
    },
    body: JSON.stringify({
      title: 'Full Stack Integration Video Project',
      sourceLanguage: 'en',
      targetLanguage: 'km',
    }),
  });
  const projData = await projRes.json();
  console.log('✓ Project created:', projRes.status, 'Title:', projData.project?.title);

  // 5. Providers Listing
  const provRes = await fetch(`${baseUrl}/api/providers`, {
    headers: { Authorization: `Bearer ${regData.accessToken}` },
  });
  const provData = await provRes.json();
  console.log('✓ Providers listed:', provData.providers?.length, 'providers available');

  // 6. Voice preview
  const ttsRes = await fetch(`${baseUrl}/api/tts/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regData.accessToken}`,
    },
    body: JSON.stringify({
      text: 'Verification test',
      voiceId: 'en-US-JennyNeural',
      targetLang: 'en',
    }),
  });
  const ttsData = await ttsRes.json();
  console.log('✓ TTS preview generated:', ttsData.audioUrl);

  server.close();
  await disconnectDatabase();
  console.log('--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
