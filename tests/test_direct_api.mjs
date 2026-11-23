import http from 'http';
import app from '../backend/dist/app.js';
import { connectDatabase, disconnectDatabase } from '../backend/dist/config/database.js';

async function testDirect() {
  console.log('Connecting DB...');
  await connectDatabase();
  console.log('DB connected.');

  const server = http.createServer(app);
  server.listen(0, '127.0.0.1', async () => {
    const port = server.address().port;
    console.log('Server listening on port', port);

    const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', async () => {
        console.log('Response /health:', res.statusCode, data);
        server.close();
        await disconnectDatabase();
        process.exit(0);
      });
    });
    req.on('error', (err) => {
      console.error('Request error:', err);
      process.exit(1);
    });
  });
}

testDirect();
