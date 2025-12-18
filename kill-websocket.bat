@echo off
echo Stopping processes on port 6001...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :6001') do (
    echo Killing process %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo Done! You can now start the WebSocket server.
pause

