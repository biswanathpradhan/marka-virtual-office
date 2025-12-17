// Set marker immediately - this should execute first
window.__APP_JS_STARTED__ = true;
console.log('=== app.js STARTING ===');

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    console.error('Error message:', event.message);
    console.error('Error filename:', event.filename);
    console.error('Error lineno:', event.lineno);
    
    const app = document.getElementById('app');
    if (app && !app.textContent.trim()) {
        app.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #e24a4a; background: #1a1a1a; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                <h2 style="color: #fff;">JavaScript Error</h2>
                <p style="color: #fff;">${event.message}</p>
                <pre style="text-align: left; background: #2a2a2a; color: #fff; padding: 1rem; border-radius: 0.25rem; overflow: auto; max-width: 800px; margin: 1rem 0; font-size: 0.875rem;">${event.error?.stack || 'No stack trace'}</pre>
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

console.log('Before imports');

import './bootstrap';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import VirtualOffice from './components/VirtualOffice.vue';

console.log('=== app.js loaded ===');
window.__APP_JS_LOADED__ = true;
console.log('Vue createApp type:', typeof createApp);
console.log('VirtualOffice component:', VirtualOffice);

// Wait for DOM to be ready
function initApp() {
    const appElement = document.getElementById('app');
    
    // Only initialize if we're on the virtual office page
    if (!appElement) {
        // Not on virtual office page, silently exit
        console.log('App element not found - not on virtual office page');
        return;
    }
    
    // Check if we're on a virtual office route
    const isVirtualOfficePage = window.location.pathname.match(/\/virtual-office\//);
    if (!isVirtualOfficePage) {
        console.log('Not on virtual office page, skipping Vue initialization');
        return;
    }
    
    try {
        console.log('Initializing Vue app...');
        console.log('Room ID from element:', appElement.dataset.roomId);
        
        // Get room ID from URL or data attribute
        const roomIdFromUrl = window.location.pathname.match(/\/virtual-office\/(\d+)/)?.[1];
        const roomId = appElement.dataset.roomId || roomIdFromUrl;
        console.log('Room ID to use:', roomId);
        
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
        const vm = app.mount('#app');
        console.log('Vue app mounted successfully');
        console.log('Vue instance:', vm);
    } catch (error) {
        console.error('Failed to mount Vue app:', error);
        console.error('Error stack:', error.stack);
        appElement.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #e24a4a; background: #1a1a1a; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                <h2 style="color: #fff;">Error Loading Application</h2>
                <p style="color: #fff;">${error.message}</p>
                <pre style="text-align: left; background: #2a2a2a; color: #fff; padding: 1rem; border-radius: 0.25rem; overflow: auto; max-width: 800px; margin: 1rem 0; font-size: 0.875rem;">${error.stack}</pre>
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
