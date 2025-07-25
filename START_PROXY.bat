@echo off
title Telegram Word Manager - PROXY VERSION
cls
echo ============================================
echo    TELEGRAM WORD MANAGER v1.0 - PROXY
echo ============================================
echo.

:: Kill existing Python processes
taskkill /IM python.exe /F 2>nul
timeout /t 1 /nobreak >nul

:: Clean session files
echo [0] Cleaning session files...
cd /d D:\peter\telegramwordl\server\sessions
del *.session-journal 2>nul
cd /d D:\peter\telegramwordl

:: Start Proxy Python server
echo [1] Starting Proxy API Server...
cd /d D:\peter\telegramwordl\server
start /min cmd /c "python proxy_server.py"
timeout /t 2 /nobreak >nul

:: Open browser
echo [2] Opening Web Interface...
cd /d D:\peter\telegramwordl
start "" "D:\peter\telegramwordl\index.html"

echo.
echo ============================================
echo      PROXY SERVER READY TO USE!
echo ============================================
echo.
echo API Server: http://localhost:5000
echo Web Interface: Opened in your browser
echo.
echo Proxy Settings:
echo - US Servers: 5ea (206.206.81.xxx)
echo - EU Servers: 5ea (88.209.253.xxx)
echo - Auto Assignment: Auto proxy assignment per account
echo.
echo Press any key to STOP all services...
pause >nul

:: Stop everything
echo.
echo Stopping services...
taskkill /IM python.exe /F 2>nul
echo All services stopped.
timeout /t 2 /nobreak >nul
exit