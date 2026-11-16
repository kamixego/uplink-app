const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// roomCode -> Set of connected sockets in that room
const rooms = new Map();

// Room cleanup timers to allow brief reconnections without destroying the room immediately
const roomCleanupTimers = new Map();

// 25-second ping-pong heartbeat to prevent Render & reverse proxy 55s idle WebSocket termination
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('[uplink-server] Terminating dead socket in room:', ws.room);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const room = url.searchParams.get('room');
  if (!room) {
    ws.close();
    return;
  }

  ws.isAlive = true;
  ws.room = room;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // If there was a pending room destruction timer, cancel it
  if (roomCleanupTimers.has(room)) {
    clearTimeout(roomCleanupTimers.get(room));
    roomCleanupTimers.delete(room);
  }

  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room).add(ws);
  console.log(`[uplink-server] Client joined room ${room} (total: ${rooms.get(room).size})`);

  // Relay messages to the other person(s) in the same room
  ws.on('message', (data) => {
    ws.isAlive = true;
    const str = data.toString();

    // Application-level ping/pong
    try {
      const parsed = JSON.parse(str);
      if (parsed && parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
    } catch (e) {
      // not JSON or other payload
    }

    const peers = rooms.get(ws.room);
    if (!peers) return;
    for (const client of peers) {
      if (client !== ws && client.readyState === 1) {
        client.send(str);
      }
    }
  });

  ws.on('close', () => {
    const peers = rooms.get(ws.room);
    if (peers) {
      peers.delete(ws);
      console.log(`[uplink-server] Client left room ${ws.room} (remaining: ${peers.size})`);
      if (peers.size === 0) {
        // Keep room alive for 45 seconds to give users a chance to reconnect on Wi-Fi/tab switch
        const timer = setTimeout(() => {
          rooms.delete(ws.room);
          roomCleanupTimers.delete(ws.room);
          console.log(`[uplink-server] Room ${ws.room} cleaned up after grace period`);
        }, 45000);
        roomCleanupTimers.set(ws.room, timer);
      }
    }
  });

  ws.on('error', (err) => {
    console.warn(`[uplink-server] Socket error in room ${ws.room}:`, err.message);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Uplink signaling server running on port ' + PORT);
});
