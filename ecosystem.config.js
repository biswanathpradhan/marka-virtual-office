/**
 * PM2 Ecosystem Configuration
 * 
 * Usage: pm2 start ecosystem.config.js
 * 
 * This file configures PM2 to run the WebSocket server
 * with automatic restarts and logging.
 */

module.exports = {
  apps: [{
    name: 'websocket-server',
    script: './websocket-server.cjs',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      WEBSOCKET_PORT: 6001,
      WEBSOCKET_HOST: '0.0.0.0'
    },
    error_file: './storage/logs/websocket-error.log',
    out_file: './storage/logs/websocket-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};

