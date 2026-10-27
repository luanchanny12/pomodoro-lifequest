@echo off
chcp 65001 >nul
title POMODORO GOAL Launcher

echo.
echo  ================================================
echo   POMODORO GOAL - Hoc Tap ^& Quan Ly Gio Muc Tieu
echo  ================================================
echo.

:: Get root directory
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

:: Kill old processes on port 8000 and 5173
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /C:"LISTENING" ^| findstr /C:":8000"') do taskkill /F /PID %%p >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /C:"LISTENING" ^| findstr /C:":5173"') do taskkill /F /PID %%p >nul 2>&1
ping 127.0.0.1 -n 2 >nul

:: Start Backend
echo  [1/2] Khoi dong Backend (FastAPI + SQLite)...
pushd "%ROOT%\backend"
start "POMODORO-Backend" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
popd
ping 127.0.0.1 -n 4 >nul

:: Start Frontend
echo  [2/2] Khoi dong Frontend (React + Vite)...
pushd "%ROOT%\frontend"
start "POMODORO-Frontend" cmd /k "npm run dev -- --host 0.0.0.0"
popd
ping 127.0.0.1 -n 4 >nul

:: Open browser
echo  Mo trinh duyet...
start http://localhost:5173

echo.
echo  ================================================
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8000
echo   API Docs : http://localhost:8000/docs
echo  ================================================
echo.
echo  Server dang chay trong 2 cua so cmd rieng.
echo  Dong cac cua so do de tat server (hoac chay stop.bat).
echo.
