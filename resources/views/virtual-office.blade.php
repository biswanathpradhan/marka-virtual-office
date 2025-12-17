<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Virtual Office - {{ config('app.name', 'Laravel') }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <div id="app" data-room-id="{{ $room }}"></div>
    
    <script>
        // Debug info
        console.log('=== Virtual Office Page Debug ===');
        console.log('Page loaded, Room ID:', {{ $room }});
        console.log('App element:', document.getElementById('app'));
        console.log('Vite assets should load now...');
        
        // Track script loading
        let scriptLoaded = false;
        let scriptError = false;
        
        // Listen for script load/error
        document.addEventListener('DOMContentLoaded', () => {
            const scripts = document.querySelectorAll('script[type="module"]');
            scripts.forEach(script => {
                script.addEventListener('load', () => {
                    console.log('Script loaded:', script.src);
                    scriptLoaded = true;
                });
                script.addEventListener('error', (e) => {
                    console.error('Script failed to load:', script.src, e);
                    scriptError = true;
                });
            });
        });
        
        // Check if Vue loaded after delays
        setTimeout(() => {
            const scripts = document.querySelectorAll('script[type="module"]');
            console.log('Module scripts found:', scripts.length);
            scripts.forEach((script, i) => {
                console.log(`Script ${i}:`, script.src || 'inline');
            });
            
            const app = document.getElementById('app');
            const hasContent = app && app.textContent.trim().length > 0;
            
            console.log('Script loaded:', scriptLoaded);
            console.log('Script error:', scriptError);
            console.log('App has content:', hasContent);
            console.log('App innerHTML:', app ? app.innerHTML.substring(0, 200) : 'N/A');
            console.log('__APP_JS_STARTED__:', window.__APP_JS_STARTED__);
            console.log('__APP_JS_LOADED__:', window.__APP_JS_LOADED__);
            
            // Check if app.js executed
            if (!window.__APP_JS_STARTED__) {
                console.error('app.js did not execute!');
                if (app) {
                    app.innerHTML = `
                        <div style="padding: 2rem; text-align: center; background: #1a1a1a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                            <h2>⚠️ JavaScript Not Executing</h2>
                            <p>The script loaded but didn't execute. Check:</p>
                            <ul style="text-align: left; color: #999; margin-top: 1rem;">
                                <li>Browser console (F12) for errors</li>
                                <li>Network tab - is the script returning 200?</li>
                                <li>Check if script has syntax errors</li>
                            </ul>
                            <p style="color: #999; margin-top: 1rem;">Room ID: {{ $room }}</p>
                            <div style="margin-top: 1rem;">
                                <a href="/rooms" style="color: #fff; text-decoration: none; padding: 0.5rem 1rem; background: #667eea; border-radius: 0.25rem; display: inline-block;">Go Back</a>
                                <button onclick="location.reload()" style="color: #fff; text-decoration: none; padding: 0.5rem 1rem; background: #667eea; border-radius: 0.25rem; border: none; cursor: pointer; margin-left: 0.5rem;">Reload</button>
                            </div>
                        </div>
                    `;
                }
            } else if (!hasContent && !scriptError) {
                console.warn('Vue app may not have initialized');
                if (app && app.innerHTML.trim() === '') {
                    app.innerHTML = `
                        <div style="padding: 2rem; text-align: center; background: #1a1a1a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                            <h2>⚠️ Application Not Loading</h2>
                            <p>JavaScript loaded but Vue app didn't initialize.</p>
                            <p style="color: #999; margin-top: 1rem;">Check browser console (F12) for errors.</p>
                            <p style="color: #999;">Room ID: {{ $room }}</p>
                            <div style="margin-top: 1rem;">
                                <a href="/rooms" style="color: #fff; text-decoration: none; padding: 0.5rem 1rem; background: #667eea; border-radius: 0.25rem; display: inline-block;">Go Back</a>
                                <button onclick="location.reload()" style="color: #fff; text-decoration: none; padding: 0.5rem 1rem; background: #667eea; border-radius: 0.25rem; border: none; cursor: pointer; margin-left: 0.5rem;">Reload</button>
                            </div>
                        </div>
                    `;
                }
            } else if (scriptError) {
                app.innerHTML = `
                    <div style="padding: 2rem; text-align: center; background: #1a1a1a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                        <h2>⚠️ Script Failed to Load</h2>
                        <p>Make sure <code>npm run dev</code> is running.</p>
                        <p style="color: #999; margin-top: 1rem;">Room ID: {{ $room }}</p>
                        <a href="/rooms" style="color: #fff; text-decoration: none; padding: 0.5rem 1rem; background: #667eea; border-radius: 0.25rem; margin-top: 1rem; display: inline-block;">Go Back</a>
                    </div>
                `;
            }
        }, 2000);
    </script>
    
    <noscript>
        <div style="padding: 2rem; text-align: center;">
            <h2>JavaScript Required</h2>
            <p>Please enable JavaScript to use Virtual Office.</p>
        </div>
    </noscript>
</body>
</html>
