@echo off
echo ===================================
echo 클린 빌드 (코드 서명 제외)
echo ===================================
echo.

REM 기존 빌드 삭제
if exist dist (
    echo 기존 빌드 삭제 중...
    rmdir /s /q dist
)

echo.
echo Electron 앱 빌드 (코드 서명 없이)...
call npm run electron-builder -- --win -c.win.forceCodeSigning=false --publish never

echo.
echo ===================================
echo 빌드 완료!
echo 출력: dist\
echo ===================================
pause