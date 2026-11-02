-- 001_perf_indexes.sql
-- Tối ưu hóa hiệu năng truy vấn cho bảng người dùng, visitor log, ma trận và phiên học tập.
-- An toàn 100%: Chỉ tạo chỉ mục tìm kiếm (Index B-Tree), KHÔNG sửa đổi hoặc xóa bất kỳ dữ liệu nào.

-- 1. Index tìm kiếm nhanh theo tên hiển thị người dùng (hỗ trợ Admin & Search)
CREATE INDEX IF NOT EXISTS ix_users_display_name ON users(display_name);

-- 2. Index tra cứu nhanh lượt truy cập theo IP hoặc Visitor ID
CREATE INDEX IF NOT EXISTS ix_visitor_logs_ip_address ON visitor_logs(ip_address);

-- 3. Composite Index tra cứu ma trận Eisenhower theo người dùng và ngày
CREATE INDEX IF NOT EXISTS idx_matrix_user_date ON daily_matrix_tasks(user_id, date);

-- 4. Composite Index tính toán tổng giờ học theo người dùng và ngày học
CREATE INDEX IF NOT EXISTS idx_study_session_user_date ON study_session_logs(user_id, session_date);

-- Cập nhật thống kê bộ lập lịch truy vấn
ANALYZE;
