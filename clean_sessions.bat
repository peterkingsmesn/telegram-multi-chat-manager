@echo off
echo Cleaning session files...
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul
cd /d D:\peter\telegramwordl\server\sessions
del *.session-journal 2>nul
echo Session journal files cleaned!
echo Note: Session files are preserved for login persistence.
pause