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

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const room = url.searchParams.get('room');
  if (!room) {
    ws.close();
    return;
  }

  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room).add(ws);
  ws.room = room;

  // Relay every message to the other person(s) in the same room only.
  ws.on('message', (data) => {
    const peers = rooms.get(ws.room);
    if (!peers) return;
    for (const client of peers) {
      if (client !== ws && client.readyState === 1) {
        client.send(data.toString());
      }
    }
  });

  ws.on('close', () => {
    const peers = rooms.get(ws.room);
    if (peers) {
      peers.delete(ws);
      if (peers.size === 0) rooms.delete(ws.room);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Uplink signaling server running on port ' + PORT);
});
