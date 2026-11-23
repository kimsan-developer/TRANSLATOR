"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_js_1 = __importDefault(require("./app.js"));
const env_js_1 = require("./config/env.js");
const database_js_1 = require("./config/database.js");
const socketService_js_1 = require("./services/socketService.js");
const jobWorkers_js_1 = require("./workers/jobWorkers.js");
async function bootstrap() {
    try {
        // 1. Connect MongoDB
        await (0, database_js_1.connectDatabase)();
        // 2. Register background job handlers
        (0, jobWorkers_js_1.registerAllJobWorkers)();
        // 3. Create HTTP & Socket.IO server
        const server = http_1.default.createServer(app_js_1.default);
        socketService_js_1.socketService.init(server, env_js_1.config.CORS_ORIGIN);
        // 4. Start listening
        server.listen(env_js_1.config.PORT, () => {
            console.log(`====================================================`);
            console.log(` VIDEO TRANSLATOR AI PRO - BACKEND SERVER READY     `);
            console.log(` Port: ${env_js_1.config.PORT}`);
            console.log(` Environment: ${env_js_1.config.NODE_ENV}`);
            console.log(` Storage Path: ${env_js_1.config.STORAGE_DIR}`);
            console.log(`====================================================`);
        });
    }
    catch (err) {
        console.error('Fatal initialization error:', err.message);
        process.exit(1);
    }
}
bootstrap();
