@echo off
echo Forcefully killing all Python processes...
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq python.exe" ^| find "python.exe"') do (
    echo Killing PID: %%i
    taskkill /PID %%i /F
)
echo.
echo Checking port 5000...
netstat -ano | findstr :5000
echo.
echo All Python processes killed.
pause