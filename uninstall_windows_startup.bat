@echo off
chcp 65001 >nul
echo ========================================================
echo   GỠ BỎ TRỢ LÝ THÔNG BÁO CHẠY NGẦM WINDOWS
echo ========================================================
echo.

set STARTUP_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PomodoroNotifier.vbs

if exist "%STARTUP_VBS%" (
    del "%STARTUP_VBS%"
    echo [THÀNH CÔNG] Đã xóa file khởi động khỏi Startup:
    echo %STARTUP_VBS%
) else (
    echo [THÔNG BÁO] Không tìm thấy file trong Startup. Dịch vụ chưa được cài đặt hoặc đã xóa trước đó.
)

echo.
echo Đang tắt tiến trình chạy ngầm nếu có...
taskkill /f /im pythonw.exe 2>nul
echo.
echo Hoàn tất!
pause
