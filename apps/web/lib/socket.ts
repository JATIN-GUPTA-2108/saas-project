import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

export function createClassroomSocket(token: string): Socket {
  return io(`${WS_URL}/classroom`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: false,
  });
}
