# Production WebSocket Server Setup

This guide explains how to run the WebSocket server on your production server.

## ⚠️ Important: One-Time Setup

**The WebSocket server is a background service that runs continuously. You only need to set it up ONCE, and it will run forever (even after server reboots). You don't need to start it every time your Laravel application runs.**

See `WEBSOCKET_RUNTIME_GUIDE.md` for more details about when the server needs to run.

## Prerequisites

1. **Node.js installed** on your server (v14 or higher)
2. **npm** or **yarn** package manager
3. **PM2** (recommended) or **systemd** for process management

## Step 1: Install Dependencies on Server

SSH into your server and navigate to your project directory:

```bash
cd /path/to/your/project
npm install --production
```

Or if you want to install all dependencies including dev:

```bash
npm install
```

## Step 2: Choose a Process Manager

### Option A: PM2 (Recommended - Easy to Use)

#### Install PM2 globally:
```bash
npm install -g pm2
```

#### Start the WebSocket server with PM2:
```bash
pm2 start websocket-server.cjs --name websocket-server
```

#### Make PM2 start on server reboot:
```bash
pm2 startup
pm2 save
```

#### Useful PM2 commands:
```bash
# View status
pm2 status

# View logs
pm2 logs websocket-server

# Restart server
pm2 restart websocket-server

# Stop server
pm2 stop websocket-server

# Monitor
pm2 monit
```

### Option B: systemd (Linux - More Control)

#### Create service file:
```bash
sudo nano /etc/systemd/system/websocket-server.service
```

#### Add this content (adjust paths):
```ini
[Unit]
Description=WebSocket Server for Laravel Broadcasting
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/your/project
ExecStart=/usr/bin/node /path/to/your/project/websocket-server.cjs
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=websocket-server

[Install]
WantedBy=multi-user.target
```

#### Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable websocket-server
sudo systemctl start websocket-server
```

#### Check status:
```bash
sudo systemctl status websocket-server
```

#### View logs:
```bash
sudo journalctl -u websocket-server -f
```

### Option C: Supervisor (Alternative)

#### Install Supervisor:
```bash
sudo apt-get install supervisor  # Ubuntu/Debian
sudo yum install supervisor       # CentOS/RHEL
```

#### Create config file:
```bash
sudo nano /etc/supervisor/conf.d/websocket-server.conf
```

#### Add this content:
```ini
[program:websocket-server]
command=/usr/bin/node /path/to/your/project/websocket-server.cjs
directory=/path/to/your/project
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/path/to/your/project/storage/logs/websocket-server.log
```

#### Reload and start:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start websocket-server:*
```

## Step 3: Configure Firewall

Make sure port 6001 (or your chosen port) is open:

### UFW (Ubuntu):
```bash
sudo ufw allow 6001/tcp
```

### firewalld (CentOS/RHEL):
```bash
sudo firewall-cmd --permanent --add-port=6001/tcp
sudo firewall-cmd --reload
```

### iptables:
```bash
sudo iptables -A INPUT -p tcp --dport 6001 -j ACCEPT
```

## Step 4: Update Environment Variables

Make sure your `.env` file on the server has:

```env
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=local-app-id
PUSHER_APP_KEY=local-key
PUSHER_APP_SECRET=local-secret
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001
PUSHER_SCHEME=http

VITE_PUSHER_APP_KEY=local-key
VITE_WEBSOCKET_PORT=6001
```

**Important:** If your server has a domain, you might need to update `PUSHER_HOST` to your domain or keep it as `127.0.0.1` if the WebSocket server runs on the same machine.

## Step 5: Update WebSocket Server for Production

If your server uses HTTPS, you might need to update `websocket-server.cjs`:

```javascript
const PORT = process.env.WEBSOCKET_PORT || 6001;
const HOST = process.env.WEBSOCKET_HOST || '0.0.0.0';
```

Then set in `.env`:
```env
WEBSOCKET_PORT=6001
WEBSOCKET_HOST=0.0.0.0
```

## Step 6: Test the Connection

1. **Check if server is running:**
```bash
# PM2
pm2 status

# systemd
sudo systemctl status websocket-server

# Supervisor
sudo supervisorctl status websocket-server
```

2. **Test WebSocket connection:**
```bash
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://your-server-ip:6001/app/local-key
```

3. **Check logs:**
```bash
# PM2
pm2 logs websocket-server

# systemd
sudo journalctl -u websocket-server -f

# Supervisor
tail -f /path/to/your/project/storage/logs/websocket-server.log
```

## Step 7: Nginx Configuration (If Using Nginx)

If you're using Nginx as a reverse proxy, add this to your Nginx config:

```nginx
# WebSocket proxy
location /app/ {
    proxy_pass http://127.0.0.1:6001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

Then update your frontend to use:
```javascript
wsHost: window.location.hostname,  // Use domain instead of 127.0.0.1
wsPort: window.location.protocol === 'https:' ? 443 : 80,  // Use standard ports
```

## Troubleshooting

### Server won't start:
- Check Node.js version: `node --version` (needs v14+)
- Check if port is already in use: `netstat -tulpn | grep 6001`
- Check file permissions: `chmod +x websocket-server.cjs`

### Connection refused:
- Check firewall rules
- Verify WebSocket server is running
- Check if port is accessible: `telnet your-server-ip 6001`

### WebSocket disconnects:
- Increase timeout in Nginx config
- Check server resources (CPU, memory)
- Review logs for errors

## Quick Start Script

Create a file `start-websocket.sh`:

```bash
#!/bin/bash
cd /path/to/your/project
node websocket-server.cjs
```

Make it executable:
```bash
chmod +x start-websocket.sh
```

Then run with PM2:
```bash
pm2 start start-websocket.sh --name websocket-server
```

## Monitoring

### PM2 Monitoring:
```bash
pm2 monit
```

### Check resource usage:
```bash
# PM2
pm2 list

# systemd
systemctl status websocket-server

# Process info
ps aux | grep websocket-server
```

## Auto-restart on Failure

All process managers above (PM2, systemd, Supervisor) are configured to automatically restart the WebSocket server if it crashes.

## Production Checklist

- [ ] Node.js installed on server
- [ ] Dependencies installed (`npm install`)
- [ ] WebSocket server running (PM2/systemd/Supervisor)
- [ ] Port 6001 open in firewall
- [ ] Environment variables configured
- [ ] Server starts on reboot (PM2 save / systemd enable)
- [ ] Logs are being written
- [ ] Connection tested from browser
- [ ] Nginx configured (if using reverse proxy)

## Support

If you encounter issues:
1. Check server logs
2. Verify WebSocket server is running
3. Test connection from browser console
4. Check firewall rules
5. Verify environment variables

