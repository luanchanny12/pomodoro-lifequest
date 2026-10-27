@echo off
chcp 65001 >nul
echo ========================================================
echo   CÀI ĐẶT TRỢ LÝ THÔNG BÁO CHẠY NGẦM CÙNG WINDOWS
echo ========================================================
echo.

set SCRIPT_DIR=%~dp0
set TARGET_PY=%SCRIPT_DIR%backend\windows_notifier.py
set STARTUP_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PomodoroNotifier.vbs

echo Đang tạo file khởi động chạy ngầm không hiện cửa sổ...
(
    echo Set WshShell = CreateObject("WScript.Shell"^)
    echo WshShell.Run "pythonw """ ^& "%TARGET_PY%" ^& """", 0, False
) > "%STARTUP_VBS%"

echo.
echo [THÀNH CÔNG] Đã đăng ký Trợ lý thông báo vào thư mục Startup của Windows!
echo Đường dẫn: %STARTUP_VBS%
echo.
echo Từ bây giờ, mỗi khi bạn bật máy tính, Windows sẽ tự động chạy ngầm (~10MB RAM)
echo và gửi thông báo nhắc nhở ở góc màn hình ngay cả khi bạn KHÔNG MỞ TRÌNH DUYỆT!
echo.
echo Đang chạy thử nghiệm dịch vụ ngay bây giờ...
wscript "%STARTUP_VBS%"
echo Xong! Bạn có thể đóng cửa sổ này.
pause
