# 🍅 POMODORO GOAL - ỨNG DỤNG QUẢN LÝ GIỜ HỌC MỤC TIÊU (LOCAL)

Ứng dụng Pomodoro Timer tối giản, thanh lịch lấy cảm hứng từ giao diện **pomodorotimer.online/vi**, kết hợp công cụ theo dõi tích lũy số giờ học để đạt mục tiêu (ví dụ: *1000 giờ học tiếng Anh*, *300 giờ lập trình*).

---

## ✨ Tính Năng Nổi Bật

1. **🍅 Pomodoro Timer Chuẩn Thẩm Mỹ**:
   - Đồng hồ đếm ngược số to rõ ràng, dễ nhìn.
   - 3 chế độ: **Pomodoro (25p)** - **Nghỉ ngắn (5p)** - **Nghỉ dài (15p)** (có thể tùy chỉnh).
   - Tự động đổi màu nền êm dịu theo phiên (Đỏ mận ấm áp, Xanh ngọc thư giãn, Xanh biển sâu).
   - Âm thanh chuông báo du dương (Bell/Ding) và âm nền tập trung (Mưa, Sóng biển, Tiếng tích tắc) chạy 100% offline.

2. **📝 Ghi Nhận Giờ Học Linh Hoạt (Hỗ trợ học offline không mở máy tính)**:
   - Khi học offline (nói chuyện, đọc sách, nghe đài mà không mở máy tính), bạn chỉ cần bấm **"+ Ghi nhận giờ học"**.
   - Chọn mục tiêu (ví dụ: *1000 Giờ Học Tiếng Anh*).
   - Nhập thời lượng (+15p, +30p, +45p, +60p, +90p... hoặc số phút tùy ý).
   - Chọn ngày học (hôm nay hoặc ngày hôm trước).
   - Ghi chú chi tiết chủ đề (ví dụ: *"Nói tiếng Anh 30 phút chủ đề Du lịch và Văn hóa"*).
   - Hệ thống tự động cộng dồn ngay vào tổng số giờ của mục tiêu!

3. **🎯 Quản Lý Mục Tiêu & Tự Động Đánh Dấu DONE**:
   - Đặt mốc số giờ mục tiêu (ví dụ: 1000 giờ).
   - Hiển thị trực quan: Số giờ đã học / Mục tiêu, thanh % tiến độ, số giờ còn lại để về đích.
   - Khi tích lũy đủ số giờ (ví dụ `current_hours >= 1000`): Tự động đánh dấu **HOÀN THÀNH (DONE 🎉)** kèm hiệu ứng chúc mừng!

4. **📊 Nhật Ký & Thống Kê Tối Giản**:
   - Xem toàn bộ lịch sử các buổi học theo ngày, kèm ghi chú chi tiết.
   - Thống kê số giờ học hôm nay, tuần này, tổng cộng và biểu đồ cột 7 ngày qua.

---

## 🚀 Cách Chạy Ứng Dụng (Local)

### Cách 1: Nhanh nhất (1-Click)
Nhấp đúp chuột vào file:
```
start.bat
```
File này sẽ tự động khởi động Backend (FastAPI + SQLite), Frontend (React + Vite) và mở trình duyệt tại:
- **Ứng dụng**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000/docs`

Để dừng ứng dụng, nhấp đúp vào:
```
stop.bat
```

---

### Cách 2: Khởi động thủ công bằng dòng lệnh

#### 1. Chạy Backend
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Chạy Frontend
```bash
cd frontend
npm run dev
```
Truy cập: `http://localhost:5173`

---

## 🛠️ Công Nghệ Sử Dụng
- **Frontend**: React 19, TypeScript, TailwindCSS, Lucide React, Recharts, Sonner Toast, Web Audio API.
- **Backend**: Python 3.8+, FastAPI, SQLAlchemy, SQLite local database.
- Hoàn toàn độc lập, lưu trữ dữ liệu an toàn trên máy tính cá nhân.
