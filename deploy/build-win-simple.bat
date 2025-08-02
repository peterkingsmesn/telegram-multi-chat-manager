@echo off
echo ===================================
echo Windows용 Electron 앱 간단 빌드
echo ===================================
echo.

REM npm 설치 확인
echo 1. 종속성 확인 중...
if not exist node_modules (
    echo Node modules 설치 중...
    npm install
)

echo.
echo 2. 아이콘 파일 확인...
if not exist assets\icon.ico (
    echo 아이콘 파일이 없습니다. 기본 아이콘 사용
)

echo.
echo 3. Electron 앱 빌드 시작...
echo Python 서버 빌드는 건너뜁니다.

REM electron-builder로 Windows용 빌드
npm run electron-builder -- --win --publish never

echo.
echo ===================================
echo 빌드 완료!
echo 출력 위치: dist\
echo ===================================

pause