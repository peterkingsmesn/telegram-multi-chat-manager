@echo off
echo ===================================
echo Python 포터블 환경 준비
echo ===================================
echo.

REM Python embeddable 패키지 다운로드 (Python 3.10)
echo 1. Python embeddable 패키지 다운로드 중...
if not exist python-embed (
    mkdir python-embed
    cd python-embed
    
    echo Downloading Python 3.10 embeddable package...
    curl -L https://www.python.org/ftp/python/3.10.11/python-3.10.11-embed-amd64.zip -o python-embed.zip
    
    echo Extracting...
    tar -xf python-embed.zip
    del python-embed.zip
    
    echo Installing pip...
    curl -L https://bootstrap.pypa.io/get-pip.py -o get-pip.py
    python.exe get-pip.py
    del get-pip.py
    
    REM python310._pth 파일 수정 (pip 사용 가능하도록)
    echo python310.zip > python310._pth
    echo . >> python310._pth
    echo ..\server >> python310._pth
    echo import site >> python310._pth
    
    cd ..
)

echo.
echo 2. Python 패키지 설치 중...
cd python-embed
python.exe -m pip install --no-warn-script-location flask flask-cors telethon nest-asyncio python-socks[asyncio] python-dotenv cryptg pillow aiofiles

echo.
echo 3. 서버 파일 복사...
cd ..
xcopy /E /I /Y server ..\python-embed\server

echo.
echo ===================================
echo Python 포터블 환경 준비 완료!
echo ===================================
pause