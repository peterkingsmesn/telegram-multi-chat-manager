@echo off
title Telegram Server
cd /d "%~dp0server"

echo ====================================
echo Stopping existing Python processes...
echo ====================================
taskkill /f /im python.exe >nul 2>&1

echo ====================================
echo Telegram API Server Starting...
echo ====================================
python proxy_server.py
pause