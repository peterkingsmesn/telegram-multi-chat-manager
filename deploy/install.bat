@echo off
echo ====================================
echo Telegram Multi-Account Manager
echo Installation Script
echo ====================================
echo.

REM Python 확인
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.7 or higher
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [OK] Python detected
echo.

REM 가상환경 생성 (선택사항)
echo Creating virtual environment...
python -m venv venv >nul 2>&1
if exist venv (
    echo [OK] Virtual environment created
    call venv\Scripts\activate.bat
) else (
    echo [SKIP] Virtual environment creation failed, using global Python
)
echo.

REM 의존성 설치
echo Installing dependencies...
cd server
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
cd ..
echo.

REM 디렉토리 생성
echo Creating required directories...
if not exist "server\sessions" mkdir "server\sessions"
if not exist "server\logs" mkdir "server\logs"
if not exist "server\temp" mkdir "server\temp"
echo [OK] Directories created
echo.

REM 설정 파일 확인
if not exist "config.json" (
    echo [WARNING] config.json not found
    echo Please copy config_example.json to config.json
    echo and update with your API credentials
    copy config_example.json config.json >nul 2>&1
)
echo.

echo ====================================
echo Installation completed!
echo ====================================
echo.
echo Next steps:
echo 1. Edit config.json with your Telegram API credentials
echo 2. Run start_server.bat to start the server
echo 3. Open index.html in your browser
echo.
pause