@echo off
echo ===================================
echo 간단한 아이콘 생성기
echo ===================================
echo.

REM Python으로 간단한 아이콘 생성
python -c "
import os
import base64

# Base64로 인코딩된 간단한 PNG 아이콘 (1x1 파란색 픽셀)
icon_data = b'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

# assets 디렉토리 생성
os.makedirs('assets', exist_ok=True)

# PNG 파일 생성
with open('assets/icon.png', 'wb') as f:
    f.write(base64.b64decode(icon_data))

# ICO로 복사 (Windows에서는 PNG를 ICO로 사용 가능)
with open('assets/icon.ico', 'wb') as f:
    f.write(base64.b64decode(icon_data))

# Linux용 아이콘
with open('assets/icon-linux.png', 'wb') as f:
    f.write(base64.b64decode(icon_data))

print('아이콘 파일이 생성되었습니다!')
print('- assets/icon.png')
print('- assets/icon.ico')
print('- assets/icon-linux.png')
"

echo.
echo 완료!
pause