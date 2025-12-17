// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    const app = document.getElementById('app');
    if (app && !app.textContent.trim()) {
        app.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #e24a4a; background: #1a1a1a; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                <h2 style="color: #fff;">JavaScript Error</h2>
                <p style="color: #fff;">${event.message}</p>
                <a href="/rooms" style="color: #fff; text-decoration: none; margin-top: 1rem; display: inline-block; padding: 0.5rem 1rem; background: #667eea; border-radius: 0.25rem;">Go Back to Rooms</a>
            </div>
        `;
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    const app = document.getElementById('app');
    if (app && !app.textContent.trim()) {
        app.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #e24a4a; background: #1a1a1a; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                <h2 style="color: #fff;">Promise Rejection Error</h2>
                <p style="color: #fff;">${event.reason?.message || event.reason}</p>
                <a href="/rooms" style="color: #fff; text-decoration: none; margin-top: 1rem; display: inline-block; padding: 0.5rem 1rem; background: #667eea; border-radius: 0.25rem;">Go Back to Rooms</a>
            </div>
        `;
    }
});

import './bootstrap';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import VirtualOffice from './components/VirtualOffice.vue';

// Wait for DOM to be ready
function initApp() {
    const appElement = document.getElementById('app');
    
    // Only initialize if we're on the virtual office page
    if (!appElement) {
        return;
    }
    
    // Check if we're on a virtual office route
    const isVirtualOfficePage = window.location.pathname.match(/\/virtual-office\//);
    if (!isVirtualOfficePage) {
        return;
    }
    
    try {
        // Get room ID from URL or data attribute
        const roomIdFromUrl = window.location.pathname.match(/\/virtual-office\/(\d+)/)?.[1];
        const roomId = appElement.dataset.roomId || roomIdFromUrl;
        
        if (!roomId) {
            throw new Error('Room ID is required');
        }
        
        // Create Vue app with VirtualOffice component directly
        const app = createApp(VirtualOffice, {
            roomId: roomId
        });
        
        const pinia = createPinia();
        app.use(pinia);
        
        // Mount Vue app
        app.mount('#app');
    } catch (error) {
        console.error('Failed to mount Vue app:', error);
        appElement.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #e24a4a; background: #1a1a1a; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                <h2 style="color: #fff;">Error Loading Application</h2>
                <p style="color: #fff;">${error.message}</p>
                <a href="/rooms" style="color: #fff; text-decoration: none; margin-top: 1rem; display: inline-block; padding: 0.5rem 1rem; background: #667eea; border-radius: 0.25rem;">Go Back to Rooms</a>
            </div>
        `;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
