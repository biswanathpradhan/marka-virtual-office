# Quick Setup: Free Self-Hosted WebSocket Server

Follow these steps to enable real-time audio and position updates (100% FREE, no limits).

## Step 1: Install Laravel WebSockets Package

Open your terminal in the project directory and run:

```bash
composer require beyondcode/laravel-websockets
php artisan vendor:publish --provider="BeyondCode\LaravelWebSockets\WebSocketsServiceProvider" --tag="migrations"
php artisan migrate
php artisan vendor:publish --provider="BeyondCode\LaravelWebSockets\WebSocketsServiceProvider" --tag="config"
```

## Step 2: Update .env File

Add or update these lines in your `.env` file:

```env
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=local-app-id
PUSHER_APP_KEY=local-key
PUSHER_APP_SECRET=local-secret
PUSHER_APP_CLUSTER=mt1
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001
PUSHER_SCHEME=http

VITE_PUSHER_APP_KEY=local-key
VITE_PUSHER_APP_CLUSTER=mt1
VITE_WEBSOCKET_PORT=6001
```

## Step 3: Start WebSocket Server

Open a **new terminal window** and run:

```bash
php artisan websockets:serve
```

**Keep this terminal running** while you use the virtual office. This is your WebSocket server.

## Step 4: Rebuild Frontend (if needed)

```bash
npm run build
```

## Step 5: Test

1. Open your virtual office in the browser
2. Open browser console (F12)
3. You should see: `✅ Laravel Echo initialized with self-hosted WebSocket server`
4. You should see: `📡 WebSocket connection: ws://your-host:6001`
5. You should see: `✅ Connected to WebSocket channel`

If you see these messages, real-time features are working! 🎉

## Troubleshooting

### Port 6001 already in use?
Change the port in `.env`:
```env
PUSHER_PORT=6002
VITE_WEBSOCKET_PORT=6002
```

### Still not working?
1. Make sure the WebSocket server is running (`php artisan websockets:serve`)
2. Check browser console for errors
3. Verify `.env` file has all the settings above
4. Clear config cache: `php artisan config:clear`

## Benefits

✅ **100% FREE** - No subscription fees
✅ **No Limits** - Unlimited connections and messages
✅ **Self-Hosted** - Runs on your own server
✅ **Real-Time** - Instant updates for audio and positions
✅ **Secure** - Uses your existing Laravel authentication

