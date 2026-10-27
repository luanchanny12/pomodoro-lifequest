@echo off
echo Dừng POMODORO GOAL...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 "') do taskkill /F /PID %%a >nul 2>&1
echo Đã dừng toàn bộ server.
pause
