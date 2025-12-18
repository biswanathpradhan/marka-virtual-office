# Fix: Port 6001 Already in Use

## Quick Fix Options

### Option 1: Kill Existing Process (Windows)

**Double-click:** `kill-websocket.bat`

Or manually:
```bash
# Find what's using port 6001
netstat -ano | findstr :6001

# Kill the process (replace [PID] with the number from above)
taskkill /PID [PID] /F
```

### Option 2: Use a Different Port

1. **Set environment variable:**
```bash
set WEBSOCKET_PORT=6002
npm run websocket
```

2. **Update your `.env` file:**
```env
PUSHER_PORT=6002
VITE_WEBSOCKET_PORT=6002
```

3. **Restart the WebSocket server**

### Option 3: Check if Server is Already Running

The WebSocket server might already be running. Check:

1. **Look for Node.js processes:**
```bash
tasklist | findstr node
```

2. **If you see `node.exe` running `websocket-server.cjs`, it's already running!**
   - You don't need to start it again
   - Just refresh your browser

## Common Causes

1. **WebSocket server already running** - Most common!
   - Check Task Manager for `node.exe`
   - If running, you're good - just use the app!

2. **Previous instance didn't close properly**
   - Use `kill-websocket.bat` to clean up

3. **Another application using port 6001**
   - Use `check-port.bat` to see what's using it
   - Kill that process or use a different port

## Verify It's Working

After fixing, check browser console for:
```
✅ Connected to self-hosted WebSocket server (FREE, UNLIMITED)
```

If you see this, the WebSocket server is connected and working!

