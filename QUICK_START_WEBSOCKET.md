# Quick Start: WebSocket Server

## 🚀 Start the WebSocket Server (REQUIRED for Audio/Video)

The WebSocket server is **REQUIRED** for real-time audio and video communication.

**Important:** Once set up with a process manager (PM2/systemd), the WebSocket server runs continuously in the background. You don't need to start it every time - it runs automatically!

### Option 1: Double-click (Easiest)
1. Double-click `START_WEBSOCKET.bat` in your project folder
2. Keep the window open while using the app

### Option 2: Command Line
```bash
npm run websocket
```

### Option 3: Direct Node Command
```bash
node websocket-server.cjs
```

## ✅ Verify It's Working

After starting the server, you should see:
```
============================================================
🚀 WebSocket Server Started
============================================================
📡 Listening on: ws://127.0.0.1:6001
💰 FREE - No limits, fully self-hosted!
✅ Ready for Laravel Echo connections
============================================================
```

Then refresh your browser. In the browser console, you should see:
```
✅ Laravel Echo initialized with self-hosted WebSocket server
📡 WebSocket connection: ws://127.0.0.1:6001
💰 FREE - No external services, no limits, fully self-hosted!
✅ Connected to self-hosted WebSocket server (FREE, UNLIMITED)
```

## ⚠️ Important Notes

1. **Keep the server running** - Don't close the WebSocket server window while using the app
2. **Port 6001** - Make sure nothing else is using port 6001
3. **Audio/Video won't work** without the WebSocket server running

## 🔧 Troubleshooting

**Port already in use?**
- Change `PORT = 6001` to another port (e.g., 6002) in `websocket-server.cjs`
- Update `PUSHER_PORT=6002` in your `.env` file
- Update `VITE_WEBSOCKET_PORT=6002` in your `.env` file
- Restart both the WebSocket server and your Laravel app

**Still not connecting?**
- Check Windows Firewall isn't blocking port 6001
- Make sure the server shows "Listening on: ws://127.0.0.1:6001"
- Check browser console for connection errors

