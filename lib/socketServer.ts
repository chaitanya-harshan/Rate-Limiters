// /lib/socketServer.ts
import { Server as IOServer } from 'socket.io';
import http from 'http';
import type { RequestResult } from './types';

let io: IOServer | null = null;

const PORT = Number(process.env.SOCKET_PORT || 4001);

function startSocketServer() {
  if (io) return io;

  // Create a minimal http server only for socket.io
  const httpServer = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Socket server');
  });

  io = new IOServer(httpServer, {
    cors: { origin: '*' }, // dev only; tighten in prod
  });

  io.on('connection', (socket) => {
    // optional: emit a welcome
    socket.emit('hello', { msg: 'socket connected' });
  });

  httpServer.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[socketServer] listening on port ${PORT}`);
  });

  return io;
}

export function emitLog(entry: RequestResult) {
  try {
    const s = io ?? startSocketServer();
    s.emit('request:event', entry);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('emitLog error', e);
  }
}

// optional helper to broadcast state updates if you add them later
export function emitState(state: any) {
  try {
    const s = io ?? startSocketServer();
    s.emit('state:update', state);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('emitState error', e);
  }
}

// auto-start (module import will start server lazily)
// startSocketServer();

export default { startSocketServer, emitLog, emitState };
