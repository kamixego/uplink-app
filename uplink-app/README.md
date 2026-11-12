# Uplink

Screen share (HD, up to 100fps requested) + simultaneous camera/mic call between two people, with a draggable/resizable picture-in-picture tile and a fullscreen mode with auto-hiding controls.

## Run locally

```
npm install
npm start
```

Then open http://localhost:3000 in two browser tabs (or two devices on the same network, using your computer's local IP instead of localhost).

## Deploy for free (Render.com)

See the deployment walkthrough from Claude for exact steps — summary:

1. Push this folder to a GitHub repo.
2. On render.com, create a new **Web Service** from that repo.
3. Build command: `npm install` — Start command: `npm start` — Instance type: **Free**.
4. Deploy. Render gives you a public `https://<your-app>.onrender.com` URL.
5. Open it, create a room, and send the invite link to the other person.

Notes:
- The free tier spins down after 15 minutes of no traffic and takes ~30–50s to wake back up on the next visit — fine for personal use, just expect a short delay on the first load after idling.
- Video/audio/screen share travel directly between the two browsers (WebRTC); this server only helps them find each other (signaling). No media passes through it.
- On strict corporate/hotel networks, direct connection can fail (no TURN relay is configured). Works reliably on typical home/office networks.
