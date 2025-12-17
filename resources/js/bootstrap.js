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

// Initialize Echo
(async () => {
    try {
        if (import.meta.env.VITE_PUSHER_APP_KEY) {
            const { default: Echo } = await import('laravel-echo');
            const { default: Pusher } = await import('pusher-js');
            
            window.Pusher = Pusher;
            window.Echo = new Echo({
                broadcaster: 'pusher',
                key: import.meta.env.VITE_PUSHER_APP_KEY,
                cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
                forceTLS: true,
                authEndpoint: '/broadcasting/auth',
                auth: {
                    headers: {
                        'X-CSRF-TOKEN': document.head.querySelector('meta[name="csrf-token"]')?.content || '',
                    },
                },
            });
        } else {
            // Fallback if Pusher is not configured - create a mock Echo
            window.Echo = {
                private: (channel) => ({
                    listen: (event, callback) => {
                        console.warn('Echo not configured - event not listened:', event);
                        return {
                            listen: (event, callback) => {
                                console.warn('Echo not configured - event not listened:', event);
                                return { listen: () => {} };
                            }
                        };
                    }
                }),
            };
        }
        window.EchoReady = true;
        console.log('Laravel Echo initialized');
    } catch (error) {
        console.error('Failed to initialize Laravel Echo:', error);
        // Create a safe fallback
        window.Echo = {
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

