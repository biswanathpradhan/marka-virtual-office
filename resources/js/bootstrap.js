import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.headers.common['Accept'] = 'application/json';
window.axios.defaults.withCredentials = true;

const token = document.head.querySelector('meta[name="csrf-token"]');
if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token.content;
}

// Laravel Echo setup
window.Echo = null;
window.EchoReady = false;

// Initialize Echo with self-hosted WebSocket support (FREE, UNLIMITED)
(async () => {
    try {
        const { default: Echo } = await import('laravel-echo');
        const { default: Pusher } = await import('pusher-js');
        
        window.Pusher = Pusher;
        
        // Use self-hosted WebSocket server (free, no limits, no external services)
        const wsHost = window.location.hostname;
        const wsPort = import.meta.env.VITE_WEBSOCKET_PORT || '6001';
        const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
        
        // Default local keys for self-hosted server
        const appKey = import.meta.env.VITE_PUSHER_APP_KEY || 'local-key';
        const appSecret = import.meta.env.VITE_PUSHER_APP_SECRET || 'local-secret';
        const appId = import.meta.env.VITE_PUSHER_APP_ID || 'local-app-id';
        
        window.Echo = new Echo({
            broadcaster: 'pusher',
            key: appKey,
            cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
            wsHost: wsHost,
            wsPort: parseInt(wsPort),
            wssPort: parseInt(wsPort),
            forceTLS: false,
            encrypted: false,
            enabledTransports: ['ws', 'wss'],
            disableStats: true,
            authEndpoint: '/broadcasting/auth',
            auth: {
                headers: {
                    'X-CSRF-TOKEN': document.head.querySelector('meta[name="csrf-token"]')?.content || '',
                },
            },
        });
        
        // Connection event listeners
        window.Echo.connector.pusher.connection.bind('connected', () => {
            console.log('✅ Connected to self-hosted WebSocket server (FREE, UNLIMITED)');
        });
        
        window.Echo.connector.pusher.connection.bind('error', (err) => {
            console.warn('⚠️ WebSocket connection error:', err);
            console.warn('💡 Make sure the WebSocket server is running on port', wsPort);
        });
        
        window.EchoReady = true;
        console.log('✅ Laravel Echo initialized with self-hosted WebSocket server');
        console.log('📡 WebSocket connection:', `${wsScheme}://${wsHost}:${wsPort}`);
        console.log('💰 FREE - No external services, no limits, fully self-hosted!');
    } catch (error) {
        console.error('❌ Failed to initialize Laravel Echo:', error);
        // Create a safe fallback
        window.Echo = {
            _isMock: true,
            private: (channel) => ({
                listen: (event, callback) => {
                    console.warn('Echo not available - event not listened:', event);
                    return {
                        listen: (event, callback) => {
                            console.warn('Echo not available - event not listened:', event);
                            return { listen: () => {} };
                        }
                    };
                }
            }),
        };
        window.EchoReady = true;
    }
})();

