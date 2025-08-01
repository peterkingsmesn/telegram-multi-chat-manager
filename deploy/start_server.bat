@echo off
title Telegram Server
cd /d "%~dp0server"

echo ====================================
echo Telegram API Server Starting...
echo ====================================
echo.
echo Config file: config.json
echo Server: http://localhost:5000
echo.
echo ====================================
echo.
echo Starting with new improved server...
python telegram_server.py
echo.
echo If error occurs, try legacy server:
echo python proxy_server.py
echo.
pause