#!/bin/bash

# WebSocket Server Startup Script
# Make executable: chmod +x start-websocket.sh
# Run: ./start-websocket.sh

cd "$(dirname "$0")"

echo "Starting WebSocket Server..."
echo "Port: ${WEBSOCKET_PORT:-6001}"
echo "Host: ${WEBSOCKET_HOST:-0.0.0.0}"
echo ""

node websocket-server.cjs

