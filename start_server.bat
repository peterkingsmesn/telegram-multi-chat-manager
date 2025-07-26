@echo off
title Telegram Server
cd /d "%~dp0server"
echo ====================================
echo Telegram API Server Starting...
echo ====================================
python proxy_server.py
pause