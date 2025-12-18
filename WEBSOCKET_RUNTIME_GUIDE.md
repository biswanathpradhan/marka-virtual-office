# WebSocket Server Runtime Guide

## When Do You Need to Start the WebSocket Server?

### ✅ **Start Once, Run Forever**

The WebSocket server is a **separate background process** that needs to run continuously. You **don't need to start it every time** your Laravel application runs.

### Key Points:

1. **One-Time Setup**: Set it up once with a process manager (PM2/systemd/Supervisor)
2. **Auto-Start on Boot**: Configure it to start automatically when the server reboots
3. **Keep Running**: It runs in the background continuously
4. **Auto-Restart**: Process managers automatically restart it if it crashes

## When the WebSocket Server Needs to Run:

### ✅ **Always Running** (Recommended)
- The WebSocket server should run **24/7** as a background service
- It handles real-time communication between users
- Without it, real-time features (audio, video, position updates) won't work

### ❌ **You DON'T Need to Start It:**
- Every time you deploy code
- Every time Laravel restarts
- Every time you run `php artisan serve`
- Every time you refresh the browser
- Every time a user visits the site

### ✅ **You DO Need to Start It:**
- **Once** after initial setup
- After server reboot (if auto-start isn't configured)
- After manually stopping it
- After it crashes (if auto-restart isn't working)

## Setup Scenarios:

### Scenario 1: Development (Local)
```bash
# Start manually when needed
npm run websocket
# OR
node websocket-server.cjs

# Keep the terminal open while developing
# Stop with Ctrl+C when done
```

### Scenario 2: Production (Server)
```bash
# Set up once with PM2
pm2 start ecosystem.config.js
pm2 startup  # Auto-start on boot
pm2 save     # Save configuration

# That's it! It will run forever
# No need to start it again
```

## Process Lifecycle:

```
Server Boot → PM2/systemd starts WebSocket server automatically
     ↓
WebSocket server runs continuously
     ↓
Handles all real-time connections
     ↓
If crashes → Auto-restarts automatically
     ↓
Server reboot → Starts automatically again
```

## Comparison with Laravel:

| Component | When It Runs | Restart Needed? |
|-----------|--------------|-----------------|
| **Laravel App** | On each HTTP request | No (handled by web server) |
| **WebSocket Server** | Continuously in background | Only if it crashes (auto-restarts) |

## Common Questions:

### Q: Do I need to start it every time I deploy?
**A:** No! The WebSocket server runs independently. You only need to restart it if you update the `websocket-server.cjs` file.

### Q: What if the server reboots?
**A:** If configured with `pm2 startup` or `systemctl enable`, it will start automatically.

### Q: What if I update my Laravel code?
**A:** No need to restart WebSocket server. Laravel and WebSocket server are separate processes.

### Q: What if the WebSocket server crashes?
**A:** PM2/systemd will automatically restart it (if configured).

### Q: Can I stop it temporarily?
**A:** Yes, but real-time features won't work:
```bash
pm2 stop websocket-server  # Stop
pm2 start websocket-server # Start again
```

## Best Practices:

### ✅ **DO:**
- Set up auto-start on boot
- Use a process manager (PM2/systemd)
- Monitor the server status
- Check logs if issues occur

### ❌ **DON'T:**
- Start it manually every time
- Run it in a terminal that you might close
- Forget to set up auto-start
- Stop it unless necessary

## Quick Status Check:

```bash
# PM2
pm2 status

# systemd
sudo systemctl status websocket-server

# Check if port is listening
netstat -tulpn | grep 6001
```

## Summary:

**The WebSocket server is a background service that runs continuously. Set it up once with auto-start, and it will handle all real-time communication automatically. You don't need to start it every time your application runs.**

