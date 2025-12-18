/**
 * Simple WebSocket Server for Laravel Broadcasting
 * FREE, UNLIMITED, SELF-HOSTED
 * 
 * Run with: node websocket-server.cjs
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const PORT = 6001;
const HOST = '0.0.0.0'; // Listen on all interfaces

// Store channels and their subscribers
const channels = new Map(); // channelName -> Set of clientIds

// Create HTTP server to handle Laravel broadcast requests
const server = http.createServer((req, res) => {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Handle Laravel broadcast POST requests
    if (req.method === 'POST' && req.url.startsWith('/apps/')) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const channelName = data.name || data.channel;
                
                if (channelName && channels.has(channelName)) {
                    // Broadcast to all subscribers of this channel
                    const subscribers = channels.get(channelName);
                    const message = JSON.stringify({
                        event: data.event || 'message',
                        channel: channelName,
                        data: data.data || body
                    });
                    
                    subscribers.forEach(clientId => {
                        const client = clients.get(clientId);
                        if (client && client.ws.readyState === WebSocket.OPEN) {
                            client.ws.send(message);
                        }
                    });
                    
                    console.log(`[${new Date().toISOString()}] Broadcasted to ${subscribers.size} clients on ${channelName}`);
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (error) {
                console.error('Error processing broadcast:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }
    
    // Default response
    res.writeHead(404);
    res.end('Not Found');
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
    server,
    verifyClient: (info) => {
        // Allow all connections (Laravel will handle auth)
        return true;
    }
});

// Store connected clients
const clients = new Map(); // clientId -> { ws, channel, connectedAt, subscribedChannels }

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    const parsedUrl = url.parse(req.url, true);
    const channel = parsedUrl.pathname; // e.g., /app/local-key
    
    console.log(`[${new Date().toISOString()}] Client connected: ${channel}`);
    
    // Store client info
    const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    clients.set(clientId, { 
        ws, 
        channel, 
        connectedAt: new Date(),
        subscribedChannels: new Set()
    });
    
    // Send connection confirmation (Pusher protocol)
    ws.send(JSON.stringify({
        event: 'pusher:connection_established',
        data: JSON.stringify({
            socket_id: clientId,
            activity_timeout: 30
        })
    }));
    
    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            
            // Handle Pusher protocol messages
            if (data.event === 'pusher:subscribe') {
                const channelName = data.channel;
                console.log(`[${new Date().toISOString()}] Client ${clientId} subscribed to: ${channelName}`);
                
                // Add to channel subscribers
                if (!channels.has(channelName)) {
                    channels.set(channelName, new Set());
                }
                channels.get(channelName).add(clientId);
                
                // Store in client's subscribed channels
                const client = clients.get(clientId);
                if (client) {
                    client.subscribedChannels.add(channelName);
                }
                
                // Confirm subscription
                ws.send(JSON.stringify({
                    event: 'pusher_internal:subscription_succeeded',
                    channel: channelName
                }));
            } else if (data.event === 'pusher:unsubscribe') {
                const channelName = data.channel;
                console.log(`[${new Date().toISOString()}] Client ${clientId} unsubscribed from: ${channelName}`);
                
                // Remove from channel subscribers
                if (channels.has(channelName)) {
                    channels.get(channelName).delete(clientId);
                    if (channels.get(channelName).size === 0) {
                        channels.delete(channelName);
                    }
                }
                
                // Remove from client's subscribed channels
                const client = clients.get(clientId);
                if (client) {
                    client.subscribedChannels.delete(channelName);
                }
            } else if (data.event === 'pusher:ping') {
                // Respond to ping
                ws.send(JSON.stringify({
                    event: 'pusher:pong',
                    data: {}
                }));
            } else {
                // Broadcast to all clients on the same channel
                const client = clients.get(clientId);
                if (client) {
                    clients.forEach((otherClient, otherId) => {
                        if (otherId !== clientId && 
                            otherClient.channel === client.channel && 
                            otherClient.ws.readyState === WebSocket.OPEN) {
                            otherClient.ws.send(message);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
    
    // Handle disconnection
    ws.on('close', () => {
        console.log(`[${new Date().toISOString()}] Client disconnected: ${clientId}`);
        
        // Remove from all channels
        const client = clients.get(clientId);
        if (client) {
            client.subscribedChannels.forEach(channelName => {
                if (channels.has(channelName)) {
                    channels.get(channelName).delete(clientId);
                    if (channels.get(channelName).size === 0) {
                        channels.delete(channelName);
                    }
                }
            });
        }
        
        clients.delete(clientId);
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] WebSocket error for ${clientId}:`, error);
    });
});

// Start server
server.listen(PORT, HOST, () => {
    console.log('='.repeat(60));
    console.log('🚀 WebSocket Server Started');
    console.log('='.repeat(60));
    console.log(`📡 Listening on: ws://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}`);
    console.log(`💰 FREE - No limits, fully self-hosted!`);
    console.log(`✅ Ready for Laravel Echo connections`);
    console.log('='.repeat(60));
    console.log('Press Ctrl+C to stop the server');
    console.log('');
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.error(`   Please stop the other service or change PORT in websocket-server.cjs`);
    } else {
        console.error('❌ Server error:', error);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down WebSocket server...');
    wss.close(() => {
        server.close(() => {
            console.log('✅ Server stopped');
            process.exit(0);
        });
    });
});

