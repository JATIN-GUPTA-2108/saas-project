import { InjectQueue } from '@nestjs/bullmq';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bullmq';
import { Server, Socket } from 'socket.io';
import { OrganizationsService } from '../organizations/organizations.service';
import { QUEUES } from '../queue/queue.constants';

type SocketUser = { id: string; email: string };

type JoinPayload = {
  courseId: string;
  organizationId: string;
};

type ChatPayload = {
  courseId: string;
  organizationId: string;
  message: string;
};

@WebSocketGateway({
  namespace: '/classroom',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class ClassroomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ClassroomGateway.name);
  private readonly presence = new Map<string, Set<string>>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly organizations: OrganizationsService,
    @InjectQueue(QUEUES.NOTIFICATIONS) private readonly notificationsQueue: Queue,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers.authorization?.replace('Bearer ', '') ?? '');
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(
        token,
        { secret: this.config.getOrThrow('JWT_ACCESS_SECRET') },
      );
      (client.data as { user: SocketUser }).user = {
        id: payload.sub,
        email: payload.email,
      };
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const rooms = [...client.rooms].filter((r) => r.startsWith('classroom:'));
    for (const room of rooms) {
      this.leaveRoom(client, room);
    }
  }

  @SubscribeMessage('classroom:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    const user = (client.data as { user?: SocketUser }).user;
    if (!user) return { error: 'Unauthorized' };

    await this.organizations.ensureMembership(user.id, payload.organizationId);
    const room = this.roomKey(payload.organizationId, payload.courseId);
    client.join(room);
    this.addPresence(room, user.id);

    const count = this.presence.get(room)?.size ?? 0;
    this.server.to(room).emit('presence:update', {
      courseId: payload.courseId,
      organizationId: payload.organizationId,
      count,
      userId: user.id,
      action: 'join',
    });

    return { joined: room, presence: count };
  }

  @SubscribeMessage('classroom:leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    const user = (client.data as { user?: SocketUser }).user;
    if (!user) return { error: 'Unauthorized' };

    const room = this.roomKey(payload.organizationId, payload.courseId);
    this.leaveRoom(client, room);
    return { left: room };
  }

  @SubscribeMessage('chat:message')
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatPayload,
  ) {
    const user = (client.data as { user?: SocketUser }).user;
    if (!user) return { error: 'Unauthorized' };
    if (!payload.message?.trim()) return { error: 'Empty message' };

    await this.organizations.ensureMembership(user.id, payload.organizationId);
    const room = this.roomKey(payload.organizationId, payload.courseId);

    const event = {
      courseId: payload.courseId,
      organizationId: payload.organizationId,
      userId: user.id,
      email: user.email,
      message: payload.message.trim(),
      sentAt: new Date().toISOString(),
    };

    this.server.to(room).emit('chat:message', event);

    await this.notificationsQueue.add('classroom-message', event, {
      attempts: 2,
      removeOnComplete: 50,
    });

    return { sent: true };
  }

  private leaveRoom(client: Socket, room: string) {
    const user = (client.data as { user?: SocketUser }).user;
    client.leave(room);
    if (user) {
      this.removePresence(room, user.id);
      const count = this.presence.get(room)?.size ?? 0;
      this.server.to(room).emit('presence:update', {
        count,
        userId: user.id,
        action: 'leave',
      });
    }
  }

  private roomKey(organizationId: string, courseId: string) {
    return `classroom:${organizationId}:${courseId}`;
  }

  private addPresence(room: string, userId: string) {
    if (!this.presence.has(room)) this.presence.set(room, new Set());
    this.presence.get(room)!.add(userId);
  }

  private removePresence(room: string, userId: string) {
    this.presence.get(room)?.delete(userId);
    if (this.presence.get(room)?.size === 0) this.presence.delete(room);
  }
}
