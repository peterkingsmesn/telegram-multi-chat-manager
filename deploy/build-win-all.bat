@echo off
echo ===================================
echo Windows용 Electron 전체 빌드
echo ===================================
echo.

REM Python embeddable 준비
echo 1. Python embeddable 환경 준비...
if not exist python-embed (
    call prepare-python.bat
)

echo.
echo 2. Electron 앱 빌드...
call npm run dist-win-simple

echo.
echo ===================================
echo 빌드 완료!
echo 출력: dist\Telegram Multi Chat Manager Setup 1.0.0.exe
echo ===================================
pause