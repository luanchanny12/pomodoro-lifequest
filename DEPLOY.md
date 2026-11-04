# 🚀 Hướng Dẫn Deploy Cloud 24/7 (Render + Vercel + Supabase)

> Repo đã được `git init` và commit sẵn. Chỉ còn thiếu bước tạo repo GitHub và deploy.

## Kiến trúc

```
GitHub repo
├── backend/   -> Render Web Service (FastAPI, free)   https://pomodoro-backend-api.onrender.com
├── frontend/  -> Vercel (React/Vite, free)            https://pomodoro-lifequest.vercel.app
└── Supabase   -> PostgreSQL free (dữ liệu không mất khi Render restart)
```

---

## BƯỚC 1 — Đẩy code lên GitHub

Máy bạn **chưa cài `gh`**. Chọn 1 trong 2 cách:

### Cách A — Cài GitHub CLI (khuyến nghị)

```powershell
winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
# Mở PowerShell MỚI, sau đó:
gh auth login          # chọn GitHub.com -> HTTPS -> Login with a web browser
cd "D:\quản lý time"
gh repo create pomodoro-lifequest --public --source=. --remote=origin --push
```

### Cách B — Tạo repo trên web

1. Vào https://github.com/new → Repository name: `pomodoro-lifequest` → **Public** → **Create repository** (KHÔNG tick Add README/.gitignore).
2. Chạy:

```powershell
cd "D:\quản lý time"
git remote add origin https://github.com/<TEN_TAI_KHOAN>/pomodoro-lifequest.git
git push -u origin main
```

Kiểm tra: `git remote -v` và `git log --oneline -1`.

> `.env`, `*.db`, `node_modules`, `__pycache__`, `venv` đã được `.gitignore` loại bỏ.

---

## BƯỚC 2 — Tạo database PostgreSQL miễn phí (Supabase)

Render Free dùng ổ đĩa tạm: **SQLite sẽ mất sạch mỗi lần restart/deploy**, đồng nghĩa mất cấu hình Telegram. Vì vậy cần PostgreSQL.

> Không dùng Render Postgres Free vì **hết hạn sau 30 ngày**. Supabase Free phù hợp chạy 24/7 (project chỉ bị pause nếu không có truy cập 7 ngày; app của bạn truy cập hằng ngày).

1. Đăng ký https://supabase.com → **New project**.
2. Đặt tên, chọn region **Southeast Asia (Singapore)**, đặt mật khẩu DB và lưu lại.
3. Vào **Connect** (góc trên) → chọn **Session pooler** (IPv4, dùng được từ Render).
4. Copy chuỗi dạng:

```
postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

5. Thay `[YOUR-PASSWORD]` bằng mật khẩu thật. Nếu mật khẩu có ký tự đặc biệt (`@ # ? &`), phải URL-encode (ví dụ `@` → `%40`).
6. Thêm `?sslmode=require` vào cuối chuỗi.

---

## BƯỚC 3 — Deploy Backend lên Render

### Cách A — Blueprint (dùng `render.yaml` ở thư mục gốc)

1. https://dashboard.render.com → **New +** → **Blueprint**.
2. Chọn repo `pomodoro-lifequest`.
3. Render đọc `render.yaml`, hỏi `DATABASE_URL` → dán chuỗi Supabase ở trên.
4. **Apply** và đợi build.

### Cách B — Web Service thủ công

1. https://dashboard.render.com → **New +** → **Web Service** → kết nối repo.
2. Điền:

| Trường | Giá trị |
|---|---|
| Name | `pomodoro-backend-api` |
| Region | `Singapore` |
| Root Directory | `backend` |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | `Free` |

3. Tab **Environment** → thêm:

| Key | Value |
|---|---|
| `DATABASE_URL` | chuỗi Supabase (có `?sslmode=require`) |
| `PYTHON_VERSION` | `3.10.12` |
| `GEMINI_API_KEY` | (tùy chọn, nếu dùng AI) |

> **Bắt buộc ghim `PYTHON_VERSION=3.10.12`**: `pandas==2.2.2` và `pydantic==2.9.0` không có wheel cho Python 3.13 (Render mặc định), build sẽ lỗi.

4. **Create Web Service** → đợi 2–5 phút.
5. Kiểm tra:
   - https://pomodoro-backend-api.onrender.com/
   - https://pomodoro-backend-api.onrender.com/api/health
   - https://pomodoro-backend-api.onrender.com/docs

> Lần đầu mở có thể chậm ~50 giây do cold start.

---

## BƯỚC 4 — Deploy Frontend lên Vercel

### Cách A — Vercel CLI

```powershell
cd "D:\quản lý time\frontend"
npx vercel login
npx vercel --prod
# Khi được hỏi, giữ Root Directory = ./ (frontend)
# Sau đó thêm biến môi trường cho production:
npx vercel env add VITE_API_URL production
# Nhập: https://pomodoro-backend-api.onrender.com/api
npx vercel --prod   # deploy lại để nhận biến môi trường
```

### Cách B — Giao diện Vercel

1. https://vercel.com → **Add New...** → **Project** → Import repo `pomodoro-lifequest`.
2. **Root Directory** → Edit → chọn `frontend`.
3. Framework Preset: **Vite** (Vercel tự nhận).
4. **Environment Variables**:

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://pomodoro-backend-api.onrender.com/api` |

5. **Deploy**.

> `frontend/vercel.json` đã cấu hình SPA rewrite để refresh trang không bị 404.
> Mỗi khi đổi `VITE_API_URL` phải **Redeploy** thì mới có hiệu lực.

Sau khi có domain Vercel, quay lại Render → thêm biến `APP_PUBLIC_URL = https://<ten-app>.vercel.app` (link trong tin nhắn Telegram).

---

## BƯỚC 5 — Giữ server thức 24/7

### 5.0 Windows Task Scheduler (ĐÃ CẤU HÌNH trên máy dev)

Đã đăng ký task `PomodoroLifeQuest-KeepAlive` (mỗi 10 phút) chạy `scripts/keep-alive.ps1` để ping `GET https://pomodoro-lifequest.onrender.com/api/health` — tránh Render free tier sleep (cold start có thể tới 30–40 giây).

- Trạng thái lần chạy gần nhất: `%TEMP%\pomodoro-keepalive.last.log`
- Kiểm tra task: `schtasks /Query /TN "PomodoroLifeQuest-KeepAlive"`
- Hạn chế: chỉ chạy khi máy dev bật. Bộ ping 24/7 (kể cả khi máy tắt) đã cấu hình ở 5.2.

### 5.1 GitHub Actions

1. Repo GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Name: `RENDER_BACKEND_URL` — Value: `https://pomodoro-lifequest.onrender.com`
3. Vào tab **Actions** → workflow **Keep Render Backend Alive 24/7** → **Run workflow** để test.

Workflow gọi `POST /api/notifications/telegram-trigger-check` mỗi 10 phút, có timeout 120 giây cho cold start.

> ⚠️ GitHub Actions có thể trễ 5–20 phút và **tự tắt workflow schedule sau 60 ngày repo không có commit**.

### 5.2 cron-job.org (ĐÃ CẤU HÌNH — ping 24/7, không phụ thuộc máy dev)

Job đang chạy trên cron-job.org:

- **Title:** `Render keep-alive (LifeQuest)`
- **Job ID:** `8789448` — quản lý tại https://console.cron-job.org/jobs
- **URL:** `GET https://pomodoro-lifequest.onrender.com/api/health`
- **Schedule:** every 5 minutes (timezone UTC)
- Test run đầu tiên: `200 OK` (250 ms); lần chạy thật đầu tiên: **Successful (231 ms)**
- Vào **EDIT** để bật thông báo email khi cron fail (mặc định `onDisable` đã bật).

Nếu cần tạo lại từ đầu: https://cron-job.org → tạo cron mới → URL trên → Schedule **every 5 minutes** → Enable → Save. Endpoint trả về JSON nhanh nên không tốn tài nguyên.

Có thể dùng UptimeRobot (GET) thay thế.

---

## BƯỚC 6 — Kích hoạt Telegram Bot

1. Mở Telegram → tìm **@BotFather** → `/newbot` → đặt tên → nhận **Bot Token** (dạng `123456789:AA...`).
2. Bấm **Start** / gửi `/start` cho bot vừa tạo (bắt buộc, nếu không bot không gửi được).
3. Lấy **Chat ID**:
   - Mở `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Tìm `"chat":{"id":123456789,...}` → đó là Chat ID.
   - Hoặc nhắn cho **@userinfobot**.
4. Mở website Vercel → bấm biểu tượng **Chuông 🔔** → tab **Telegram Bot (Điện Thoại)**.
5. Nhập Bot Token, Chat ID, URL Vercel → bấm **Lưu & Bắn Thử Tin Nhắn**.

Kiểm tra gửi theo lịch (gửi ngay cả sáng và tối):

```powershell
Invoke-RestMethod -Method Post -Uri "https://pomodoro-backend-api.onrender.com/api/notifications/telegram-trigger-check?force=true"
```

Lịch mặc định: **08:00** và **21:30** (GMT+7). Có thể đổi trong tab Telegram của ứng dụng.

---

## BƯỚC 7 — Thiết lập Sentry (Error Tracking) Miễn Phí (Tùy chọn)

1. Đăng ký tài khoản miễn phí tại https://sentry.io.
2. Tạo 2 Project:
   - **Frontend**: Tạo project nền tảng `React` → Copy **DSN**.
   - **Backend**: Tạo project nền tảng `FastAPI` / `Python` → Copy **DSN**.
3. Cấu hình biến môi trường:
   - **Render** (Service `pomodoro-lifequest` → Tab Environment): Thêm biến `SENTRY_DSN` = `<Backend DSN>`.
   - **Vercel** (Project Settings → Environment Variables): Thêm biến `VITE_SENTRY_DSN` = `<Frontend DSN>`.
4. Kiểm tra:
   - Khi có crash hay runtime exception unhandled, Sentry tự động gửi báo cáo chi tiết stacktrace về dashboard.
   - Sentry được lập trình tự động tắt trong môi trường test (`TESTING=true` hoặc `MODE=test`), đảm bảo không gửi dữ liệu giả mạo.

---

## BƯỚC 8 — Quản Lý Schema Database Với Alembic Migrations

Hệ thống đã được thiết lập migration với Alembic (`backend/alembic`), có **guard chống chạm nhầm DB prod**:

> 🛡️ **Guard**: `alembic/env.py` phát hiện `DATABASE_URL` là PostgreSQL sẽ **dừng và báo lỗi** trừ khi bạn set `ALEMBIC_ALLOW_PROD=true`. Chế độ `TESTING=true` luôn dùng SQLite cách ly.

### 8.1 Lần ĐẦU TIÊN trên DB prod đã có 19 bảng sẵn

DB Neon đã tồn tại toàn bộ schema (do `Base.metadata.create_all()` tạo từ trước) → **không được** chạy `upgrade head` (sẽ báo "already exists"). Hãy **đánh dấu** schema hiện tại đã khớp baseline:

```bash
cd backend
ALEMBIC_ALLOW_PROD=true alembic current        # xem trạng thái (sẽ trống)
ALEMBIC_ALLOW_PROD=true alembic stamp head     # ghi nhận "đã ở revision b402edb2b37f" — KHÔNG chạy DDL gì cả
ALEMBIC_ALLOW_PROD=true alembic current        # xác nhận hiện tại = b402edb2b37f
```

### 8.2 Quy trình với các migration MỚI (khi sửa models)

1. **Thử trên DB test cục bộ trước** (không cần guard):
   ```bash
   cd backend
   TEST_DATABASE_URL=sqlite:///./alembic_local.db alembic upgrade head
   ```
2. Tạo migration mới:
   ```bash
   alembic revision --autogenerate -m "mo_ta_thay_doi"
   ```
3. Chạy **toàn bộ test** (pytest unit + e2e) — phải pass.
4. Mới áp lên prod (có backup sẵn ở BƯỚC 9):
   ```bash
   ALEMBIC_ALLOW_PROD=true alembic upgrade head
   ```

### 8.3 ⛔ CẤM trên production
- **`alembic downgrade`** — baseline của nó là `DROP` 19 bảng = **mất toàn bộ dữ liệu người dùng**. Rollback schema phải viết migration bù, hoặc restore từ backup (BƯỚC 9).
- Chạy `alembic` khi `.env` trỏ prod mà **không** set `ALEMBIC_ALLOW_PROD=true` (guard sẽ chặn, đừng tắt guard).

---

## BƯỚC 9 — Tự Động Sao Lưu Database Hằng Ngày (Daily Backup)

Hệ thống sử dụng GitHub Actions workflow `.github/workflows/db-backup.yml` để tự động sao lưu toàn bộ Neon PostgreSQL:
1. **Thiết lập GitHub Secret**:
   - Vào GitHub Repo → **Settings** → **Secrets and variables** → **Actions**.
   - Bấm **New repository secret**:
     - Name: `DATABASE_URL`
     - Value: Chuỗi kết nối Neon PostgreSQL của bạn (dạng `postgresql://...`).
2. **Cơ chế hoạt động**:
   - Tự động chạy mỗi ngày lúc **02:00 sáng** (giờ Việt Nam).
   - Dùng `pg_dump` nén thành file `.sql.gz` và lưu trữ trong tab **Actions → Artifacts** của GitHub trong **7 ngày**.
   - Bạn cũng có thể bấm nút **Run workflow** thủ công bất kỳ lúc nào để tải bản sao lưu tức thì!

---

## BƯỚC 10 — Giám Sát Uptime & Log Retention (Observability)

1. **UptimeRobot (Giám Sát 24/7 Miễn Phí)**:
   - Đăng ký tài khoản miễn phí tại https://uptimerobot.com.
   - Bấm **Add New Monitor**:
     - **Monitor Type**: `HTTP(s)`
     - **Friendly Name**: `LifeQuest Backend Health`
     - **URL (or IP)**: `https://pomodoro-lifequest.onrender.com/api/health`
     - **Monitoring Interval**: `5 minutes` (mỗi 5 phút)
     - **Alert Contacts**: Chọn email của bạn.
   - **Tác dụng kép**: Vừa giữ server Render luôn thức (keep-alive) bổ trợ cho task Windows, vừa lập tức gửi email thông báo nếu server gặp sự cố hoặc mất mạng!

2. **Render Free Tier Log Retention**:
   - Gói Render Free chỉ lưu log trực tiếp trong **15 - 60 phút gần nhất** trên web dashboard (mọi log cũ hơn sẽ bị xoay vòng và biến mất khi server sleep/restart).
   - **Giải pháp theo dõi**:
     - Lỗi crash/exception: Đã tích hợp **Sentry** (xem Bước 7), lưu trữ lỗi tự động trong 30 ngày (miễn phí 5.000 errors/tháng).
     - Dữ liệu truy cập & người dùng: Đã lưu trực tiếp trong bảng `visitor_logs` và xem tại tab **Lưu Lượng** trong Cổng Quản Trị Admin.

3. **Tối Ưu Độ Trễ DB Region (Oregon vs Singapore)**:
   - Hiện tại: Render service ở Oregon (`us-west-2`), Neon DB ở Singapore (`ap-southeast-1`).
   - Độ trễ mạng xuyên Thái Bình Dương cộng dồn làm các API query DB (như `/api/focus/goals`) tốn ~1.200ms TTFB.
   - **Để đạt tốc độ tối đa (<250ms)**:
     - Tạo project Neon mới chọn region `US West (Oregon) aws-us-west-2`.
     - Xuất dữ liệu từ Singapore và nhập vào Oregon, sau đó cập nhật `DATABASE_URL` trên Render.

---

| Vấn đề | Cách sửa |
|---|---|
| Thiếu driver PostgreSQL | Thêm `psycopg2-binary==2.9.9` vào `backend/requirements.txt` |
| Render dùng Python 3.13 làm fail `pandas` | Thêm `backend/.python-version` = `3.10.12` + `PYTHON_VERSION` trong `render.yaml` |
| `vercel.json` rewrite `/api` về domain placeholder | Bỏ rewrite sai, chỉ giữ SPA fallback |
| `VITE_API_URL` có dấu `/` cuối gây `//` | Chuẩn hóa trong `src/services/api.ts` |
| Bỏ lỡ tin nhắn nếu Render ngủ đúng 08:00 | Gửi bù trong cửa sổ 90 phút + lưu ngày đã gửi vào DB |
| Restart làm gửi trùng tin nhắn | Lưu `last_morning_sent_date` / `last_evening_sent_date` trong DB thay vì RAM |
| Ping keep-alive chỉ dùng POST | Endpoint nhận cả `GET` và `POST` |
| Kết nối DB idle bị Supabase đóng | `pool_pre_ping=True`, `pool_recycle=300` |
| Mỗi lần restart xoá sạch lịch sử/thống kê | Chỉ xoá seed khi đặt `RESET_SEED_DATA_ON_START=true` (mặc định tắt) |

---

## 🧪 Checklist sau khi deploy

- [ ] `https://pomodoro-backend-api.onrender.com/api/health` trả `{"status":"ok"}`
- [ ] `https://pomodoro-backend-api.onrender.com/docs` mở được
- [ ] Website Vercel mở được, dữ liệu load (không lỗi CORS/Network)
- [ ] GitHub secret `RENDER_BACKEND_URL` đã tạo, workflow chạy xanh
- [ ] cron-job.org chạy mỗi 5 phút, status 200
- [ ] Bấm "Lưu & Bắn Thử" nhận được tin Telegram
- [ ] `?force=true` nhận đủ 2 tin (sáng + tối)
- [ ] Đặt giờ hẹn 1–2 phút sau đó, đợi và xác nhận tin tự động gửi

> Lưu ý bảo mật: Bot Token và Chat ID được lưu dạng plaintext trong bảng `notification_settings`. Không chia sẻ token; nếu lộ, vào BotFather `/revoke` để tạo token mới.
