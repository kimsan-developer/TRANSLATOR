"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
class SocketService {
    io = null;
    init(server, corsOrigin) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: corsOrigin,
                methods: ['GET', 'POST'],
                credentials: true,
            },
        });
        this.io.on('connection', (socket) => {
            // Allow client to join project-specific room
            socket.on('join:project', (projectId) => {
                socket.join(`project:${projectId}`);
            });
            socket.on('leave:project', (projectId) => {
                socket.leave(`project:${projectId}`);
            });
            socket.on('disconnect', () => { });
        });
        console.log('[Socket] Socket.IO service initialized');
    }
    emitToProject(projectId, event, data) {
        if (this.io) {
            this.io.to(`project:${projectId}`).emit(event, data);
            // Also broadcast globally so dashboard jobs list updates in real-time
            this.io.emit('job:update', { projectId, event, data });
        }
    }
    emitGlobal(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }
}
exports.SocketService = SocketService;
exports.socketService = new SocketService();
