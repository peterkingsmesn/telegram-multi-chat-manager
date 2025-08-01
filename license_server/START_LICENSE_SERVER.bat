@echo off
echo ===================================
echo License Server Starting...
echo ===================================
echo.

REM Change to server directory
cd /d "%~dp0server"

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

REM Install requirements if needed
if not exist .deps_installed (
    echo Installing dependencies...
    pip install -r ../requirements.txt
    if errorlevel 0 (
        echo. > .deps_installed
        echo Dependencies installed successfully
    ) else (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Starting License Server...
echo.
echo Admin Panel: http://localhost:5001
echo Default Login: admin / admin123
echo.
echo Opening admin panel in browser...
start http://localhost:5001
echo.
echo Press Ctrl+C to stop the server
echo ===================================
echo.

REM Start the license server
python license_server.py

pause