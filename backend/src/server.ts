import http from 'http';
import app from './app.js';
import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { socketService } from './services/socketService.js';
import { registerAllJobWorkers } from './workers/jobWorkers.js';

async function bootstrap() {
  try {
    // 1. Connect MongoDB
    await connectDatabase();

    // 2. Register background job handlers
    registerAllJobWorkers();

    // 3. Create HTTP & Socket.IO server
    const server = http.createServer(app);
    socketService.init(server, config.CORS_ORIGIN);

    // 4. Start listening
    server.listen(config.PORT, () => {
      console.log(`====================================================`);
      console.log(` VIDEO TRANSLATOR AI PRO - BACKEND SERVER READY     `);
      console.log(` Port: ${config.PORT}`);
      console.log(` Environment: ${config.NODE_ENV}`);
      console.log(` Storage Path: ${config.STORAGE_DIR}`);
      console.log(`====================================================`);
    });
  } catch (err: any) {
    console.error('Fatal initialization error:', err.message);
    process.exit(1);
  }
}

bootstrap();
