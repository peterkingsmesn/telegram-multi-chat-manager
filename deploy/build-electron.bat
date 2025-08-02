@echo off
echo ===================================
echo Electron 앱 빌드 시작
echo ===================================
echo.

REM 종속성 설치
echo 1. Node.js 종속성 설치...
call npm install
if errorlevel 1 goto error

echo.
echo 2. Python 서버 실행 파일 생성...
call pyinstaller pyinstaller.spec --clean
if errorlevel 1 goto error

echo.
echo 3. Electron 앱 빌드...
call npm run dist-win
if errorlevel 1 goto error

echo.
echo ===================================
echo 빌드 완료!
echo 출력 위치: dist/
echo ===================================
goto end

:error
echo.
echo ===================================
echo 빌드 중 오류가 발생했습니다!
echo ===================================

:end
pause