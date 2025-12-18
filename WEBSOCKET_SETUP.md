# Free WebSocket Server Setup (Self-Hosted, Unlimited)

This application uses a **self-hosted WebSocket server** for real-time communication. It's **100% FREE** with **NO LIMITS** and **NO EXTERNAL SERVICES** required.

## Option 1: Laravel WebSockets (Recommended - Easiest)

### Installation

1. Install the Laravel WebSockets package:
```bash
composer require beyondcode/laravel-websockets
php artisan vendor:publish --provider="BeyondCode\LaravelWebSockets\WebSocketsServiceProvider" --tag="migrations"
php artisan migrate
php artisan vendor:publish --provider="BeyondCode\LaravelWebSockets\WebSocketsServiceProvider" --tag="config"
```

2. Update your `.env` file:
```env
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=local-app-id
PUSHER_APP_KEY=local-key
PUSHER_APP_SECRET=local-secret
PUSHER_APP_CLUSTER=mt1
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001
PUSHER_SCHEME=http

VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_WEBSOCKET_PORT="${PUSHER_PORT}"
```

3. Start the WebSocket server:
```bash
php artisan websockets:serve
```

The WebSocket server will run on `ws://127.0.0.1:6001`

## Option 2: Laravel Reverb (Laravel 11+)

If you're using Laravel 11 or later:

1. Install Reverb:
```bash
composer require laravel/reverb
php artisan reverb:install
```

2. Update your `.env`:
```env
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=local-app-id
REVERB_APP_KEY=local-key
REVERB_APP_SECRET=local-secret
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
```

3. Start Reverb:
```bash
php artisan reverb:start
```

## Option 3: Simple Node.js WebSocket Server

If you prefer a simple Node.js solution:

1. Create `websocket-server.js`:
```javascript
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server, path: '/app/local-key' });

wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('message', (message) => {
        // Broadcast to all clients
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
});

server.listen(6001, () => {
    console.log('WebSocket server running on ws://127.0.0.1:6001');
});
```

2. Install and run:
```bash
npm install ws
node websocket-server.js
```

## Quick Start (Recommended)

For the fastest setup, use **Laravel WebSockets**:

```bash
# Install
composer require beyondcode/laravel-websockets
php artisan vendor:publish --provider="BeyondCode\LaravelWebSockets\WebSocketsServiceProvider" --tag="migrations"
php artisan migrate
php artisan vendor:publish --provider="BeyondCode\LaravelWebSockets\WebSocketsServiceProvider" --tag="config"

# Update .env (add these lines)
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=local-app-id
PUSHER_APP_KEY=local-key
PUSHER_APP_SECRET=local-secret
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001
PUSHER_SCHEME=http

VITE_PUSHER_APP_KEY=local-key
VITE_WEBSOCKET_PORT=6001

# Start the server
php artisan websockets:serve
```

## Running in Production

For production, use a process manager like **Supervisor** or **PM2** to keep the WebSocket server running:

### Supervisor Example

Create `/etc/supervisor/conf.d/websockets.conf`:
```ini
[program:websockets]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/your/project/artisan websockets:serve
autostart=true
autorestart=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/path/to/your/project/storage/logs/websockets.log
```

Then:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start websockets:*
```

## Benefits

✅ **100% FREE** - No subscription fees  
✅ **UNLIMITED** - No message limits or connection limits  
✅ **SELF-HOSTED** - Complete control over your data  
✅ **REAL-TIME** - Instant updates for all users  
✅ **SECURE** - All communication stays on your server  
✅ **SCALABLE** - Can handle thousands of concurrent connections  

## Troubleshooting

1. **Connection refused**: Make sure the WebSocket server is running
2. **CORS errors**: Check that your WebSocket server allows connections from your domain
3. **Authentication failed**: Verify your `.env` keys match between server and client
4. **Port already in use**: Change `PUSHER_PORT` in `.env` to a different port

## Testing

After starting the WebSocket server, open your browser console. You should see:
```
✅ Laravel Echo initialized with self-hosted WebSocket server
📡 WebSocket connection: ws://127.0.0.1:6001
💰 FREE - No external services, no limits, fully self-hosted!
✅ Connected to self-hosted WebSocket server (FREE, UNLIMITED)
```

If you see connection errors, make sure:
1. The WebSocket server is running
2. The port matches your `.env` configuration
3. Your firewall allows connections on that port
