@echo off
chcp 65001 >nul
title KHOI TAO GIT VA CHUAN BI DEPLOY CLOUD 24/7

echo =====================================================================
echo    🚀 POMODORO GOAL FOCUS HUB - THIET LAP DEPLOY CLOUD 24/7 🚀
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Kiem tra Git tren may...
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] May ban chua cai dat Git. Vui long cai Git tu https://git-scm.com/
    pause
    exit /b 1
)
echo [OK] Git da san sang!
echo.

echo [2/3] Khoi tao Git Repository va dong goi ma nguon...
if not exist .git (
    git init
    git branch -M main
)

git add .
git commit -m "feat: deploy pomodoro goal focus hub with 24/7 cloud telegram reminders"
echo [OK] Ma nguon da duoc commit xong!
echo.

echo =====================================================================
echo   🎉 HOAN TAT CHUAN BI! CAC BUOC TIEP THEO DE DUA LEN CLOUD 24/7:
echo =====================================================================
echo.
echo Buoc 1: Len https://github.com/new tao mot repository moi (VD: pomodoro-app).
echo.
echo Buoc 2: Chay 2 lenh sau trong terminal cua thu muc nay:
echo    git remote add origin https://github.com/TEN_TAI_KHOAN/pomodoro-app.git
echo    git push -u origin main
echo.
echo Buoc 3: DEPLOY BACKEND LEN RENDER (24/7 Mien Phi)
echo    - Vao https://render.com/ -> Dang nhap bang GitHub
echo    - Bam "New +" -> Chon "Web Service" -> Chon repo "pomodoro-app"
echo    - Root Directory: backend
echo    - Build Command: pip install -r requirements.txt
echo    - Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
echo    - Nhan duoc domain: https://pomodoro-xxx.onrender.com
echo.
echo Buoc 4: DEPLOY FRONTEND LEN VERCEL (Mien Phi)
echo    - Vao https://vercel.com/ -> Dang nhap bang GitHub
echo    - Bam "Add New..." -> "Project" -> Import repo "pomodoro-app"
echo    - Root Directory: frontend
echo    - Environment Variables:
echo        VITE_API_URL = https://pomodoro-xxx.onrender.com/api
echo    - Bam Deploy! Nhan duoc web: https://pomodoro-xxx.vercel.app
echo.
echo =====================================================================
echo.
pause
