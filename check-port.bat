@echo off
echo Checking what's using port 6001...
echo.
netstat -ano | findstr :6001
echo.
echo If you see a PID (Process ID), you can kill it with:
echo taskkill /PID [PID_NUMBER] /F
echo.
pause

