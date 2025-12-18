@echo off
echo ========================================
echo Restarting WebSocket Server
echo ========================================
echo.
echo Step 1: Stopping existing server...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :6001') do (
    echo Killing process %%a
    taskkill /PID %%a /F 2>nul
)

timeout /t 2 /nobreak >nul

echo.
echo Step 2: Starting WebSocket server...
echo.

node websocket-server.cjs

pause

