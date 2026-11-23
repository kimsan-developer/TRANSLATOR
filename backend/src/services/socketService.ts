import { Server as SocketIOServer } from 'socket.io';
import http from 'http';

export class SocketService {
  private io: SocketIOServer | null = null;

  public init(server: http.Server, corsOrigin: string) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.on('connection', (socket) => {
      // Allow client to join project-specific room
      socket.on('join:project', (projectId: string) => {
        socket.join(`project:${projectId}`);
      });

      socket.on('leave:project', (projectId: string) => {
        socket.leave(`project:${projectId}`);
      });

      socket.on('disconnect', () => {});
    });

    console.log('[Socket] Socket.IO service initialized');
  }

  public emitToProject(projectId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`project:${projectId}`).emit(event, data);
      // Also broadcast globally so dashboard jobs list updates in real-time
      this.io.emit('job:update', { projectId, event, data });
    }
  }

  public emitGlobal(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

export const socketService = new SocketService();
