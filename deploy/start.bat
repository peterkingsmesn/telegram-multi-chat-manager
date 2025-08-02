@echo off
echo ===================================
echo 텔레그램 멀티 챗 매니저 시작
echo ===================================
echo.

REM 환경 변수 설정
set FLASK_APP=telegram_server.py
set FLASK_ENV=production

REM .env 파일이 있으면 로드
if exist .env (
    echo .env 파일에서 설정을 로드합니다...
    for /f "tokens=1,* delims==" %%a in (.env) do (
        set %%a=%%b
    )
) else (
    echo .env 파일이 없습니다. 기본값을 사용합니다.
    set SECRET_KEY=your-production-secret-key-here
    set LICENSE_SERVER_URL=http://localhost:5001
    set LICENSE_API_KEY=optional-api-key
)

REM Python 가상환경 활성화 (있는 경우)
if exist venv\Scripts\activate.bat (
    echo 가상환경 활성화 중...
    call venv\Scripts\activate.bat
)

REM 서버 디렉토리로 이동
cd /d "%~dp0server"

echo.
echo 텔레그램 서버 시작 중...
echo 브라우저에서 http://localhost:5555/login.html 접속
echo.

REM Flask 서버 실행
python telegram_server.py

pause