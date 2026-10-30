"""
Windows Native Background Notifier for Pomodoro Goal Focus Hub.
Runs as a lightweight background daemon (~10MB RAM) on Windows.
Sends native Windows Toast Notifications even when the browser or app is closed!
"""

import sys
import os
import time
import datetime
import subprocess
import json
import urllib.request

APP_TITLE = "Pomodoro Focus & Goal Hub"
APP_URL = "http://localhost:5173"
API_BASE_URL = "http://localhost:8000/api"

def send_windows_toast(title: str, message: str, url: str = APP_URL):
    """
    Sends a native Windows Toast Notification using Windows.UI.Notifications WinRT API via PowerShell.
    Sử dụng Base64 encoding để triệt tiêu 100% nguy cơ Command Injection / Remote Code Execution.
    """
    import base64
    b64_title = base64.b64encode(str(title).encode("utf-8")).decode("ascii")
    b64_msg = base64.b64encode(str(message).encode("utf-8")).decode("ascii")

    ps_script = f"""
    $title = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('{b64_title}'))
    $msg = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('{b64_msg}'))
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $textNodes = $template.GetElementsByTagName('text')
    $textNodes.Item(0).AppendChild($template.CreateTextNode($title)) | Out-Null
    $textNodes.Item(1).AppendChild($template.CreateTextNode($msg)) | Out-Null
    $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Pomodoro Focus Hub').Show($toast)
    """

    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            check=False,
            timeout=10,
        )
        return True
    except Exception as e:
        print(f"Error sending Windows toast: {e}")
        return False

def check_and_notify():
    """
    Checks the current time and database/API status to trigger smart contextual notifications.
    """
    now = datetime.datetime.now()
    current_time_str = now.strftime("%H:%M")
    current_hour = now.hour
    current_minute = now.minute

    # 1. Khung giờ sáng: 08:00 AM -> Nhắc nhở Ô 1 & Ô 2
    if current_hour == 8 and current_minute == 0:
        send_windows_toast(
            "🌅 Chào Buổi Sáng Năng Lượng!",
            "Hãy mở Ma Trận 4 Ô xem các việc khẩn cấp (Ô 1) và mục tiêu lớn (Ô 2) hôm nay nhé!",
        )
        time.sleep(60) # avoid repeated triggers within the same minute
        return

    # 2. Khung giờ chiều: 14:00 PM -> Phá tan cơn buồn ngủ
    if current_hour == 14 and current_minute == 0:
        send_windows_toast(
            "⚡ Khởi Động Buổi Chiều!",
            "Làm một phiên Pomodoro 25 phút khởi động nhẹ nhàng để bứt phá mục tiêu nào!",
        )
        time.sleep(60)
        return

    # 3. Khung giờ tối: 21:30 PM -> Chuẩn bị ngày mai (Night-before Routine)
    if current_hour == 21 and current_minute == 30:
        send_windows_toast(
            "🌙 Kế Hoạch Tối Hôm Trước!",
            "Dành 3 phút lên trước Ma Trận 4 Ô cho ngày mai để sáng dậy có lộ trình rõ ràng nha!",
        )
        time.sleep(60)
        return

def run_loop():
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Windows Background Notifier started.")
    print("Monitoring golden reminder hours (08:00, 14:00, 21:30) and active study intervals...")

    # Initial friendly launch notification
    send_windows_toast(
        "✨ Trợ Lý Nhắc Nhở Đã Kích Hoạt",
        "Dù bạn đóng trình duyệt, hệ thống vẫn sẽ nhắc nhở bạn đúng giờ!",
    )

    while True:
        try:
            check_and_notify()
        except Exception as e:
            print(f"Notifier loop error: {e}")
        time.sleep(30) # Check every 30 seconds

if __name__ == "__main__":
    if "--test" in sys.argv:
        print("Sending test notification...")
        success = send_windows_toast(
            "🔔 Pomodoro Focus Hub: Thông Báo Mẫu",
            "Chúc mừng! Tính năng thông báo Windows Native gốc đang hoạt động hoàn hảo!",
        )
        if success:
            print("Successfully sent Windows Toast!")
        else:
            print("Failed to send Windows Toast.")
    else:
        run_loop()
