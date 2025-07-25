@echo off
echo Stopping all Python processes...
taskkill /F /IM python.exe 2>nul
echo All services stopped.
pause