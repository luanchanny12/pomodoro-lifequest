@echo off
chcp 65001 >nul
title Public Internet & Mobile Access - Pomodoro Focus Hub
cls
echo =========================================================================
echo    POMODORO GOAL FOCUS HUB - PUBLIC INTERNET ^& MOBILE ACCESS
echo =========================================================================
echo.
echo [1] Đang kiểm tra IP Wi-Fi nội bộ của bạn...
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0 ^| findstr /v "On-link"') do set LOCAL_IP=%%a

echo    - Địa chỉ Wi-Fi nội bộ: http://%LOCAL_IP%:5173
echo    - Mọi điện thoại (iPhone/Android) bắt cùng Wi-Fi nhà bạn có thể gõ link trên để dùng ngay!
echo.
echo [2] Đang kích hoạt Public Internet Tunnel (HTTPS ra toàn thế giới)...
echo    - Bạn có thể gửi link này cho bạn bè hoặc mở bằng 4G ngoài đường.
echo    - Vui lòng chờ 3-5 giây để nhận đường link public...
echo.
echo =========================================================================
echo.

npx localtunnel --port 5173
pause
