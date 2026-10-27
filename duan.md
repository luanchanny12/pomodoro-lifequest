# DỰ ÁN LIFE QUEST

## Giới Thiệu

**LIFE QUEST** là hệ thống quản lý học tập cá nhân kết hợp Gamification (Game hóa), giúp người dùng đạt được các mục tiêu học tập dài hạn như GPA, IELTS, DevOps Roadmap thông qua cơ chế giống game (Level, EXP, Streak, Achievement).

**KHÔNG phải Todo App.** Đây là một trò chơi học tập.

---

## Công Nghệ Sử Dụng

### Frontend
| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| React | 19 | UI framework |
| TypeScript | 5.6 | Ngôn ngữ |
| Vite | 6 | Build tool |
| TailwindCSS | 3.4 | CSS framework |
| shadcn/ui | - | UI Components (18 components) |
| Framer Motion | 11.11 | Animation |
| TanStack Query | 5.60 | Data fetching & caching |
| React Router | 7 | Routing |
| React Hook Form | 7.53 | Form management |
| Zod | 3.23 | Validation |
| Axios | 1.7 | HTTP client |
| Recharts | 2.13 | Biểu đồ |
| Sonner | 1.7 | Toast notifications |
| Lucide React | - | Icons |
| date-fns | 4.1 | Date utilities |

### Backend
| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| FastAPI | 0.115 | Web framework |
| SQLAlchemy | 2.0.35 | ORM |
| Pydantic | 2.9 | Data validation |
| SQLite | - | Database |
| Uvicorn | 0.30 | ASGI server |
| openpyxl | 3.1.5 | Excel export |
| pandas | 2.2.2 | Data processing |
| reportlab | 4.2 | PDF export |
| Alembic | 1.13 | Migration (optional) |

### DevOps
| Công nghệ | Mục đích |
|-----------|----------|
| Docker | Container |
| docker-compose | Multi-container |

---

## Cấu Trúc Dự Án

```
D:\quản lý time\
├── .env                           # Biến môi trường
├── docker-compose.yml             # Docker compose
├── README.md                      # Hướng dẫn (tiếng Việt)
├── duan.md                        # Tài liệu dự án (file này)
├── start.bat                      # 1-click start (CMD)
├── stop.bat                       # Dừng servers
│
├── backend/                       # FastAPI Backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── conftest.py                # Pytest fixtures
│   ├── seed.py                    # Seed dữ liệu mẫu
│   ├── lifequest.db               # SQLite database
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_ai.py             # 9 unit tests AI
│   │   └── test_api.py            # 8 integration tests API
│   └── app/
│       ├── __init__.py
│       ├── main.py                # App entry, CORS, startup + seed
│       ├── database.py            # SQLite connection
│       ├── models.py              # 24 ORM models (14 cũ + 10 mới AI)
│       ├── schemas.py             # Pydantic schemas
│       ├── ai/                    # 🧠 AI Engine (5 modules)
│       │   ├── __init__.py
│       │   ├── ai_brain.py        # Brain: học tập, suy luận bài tiếp
│       │   ├── ai_planner.py      # Planner: kế hoạch học tập ngày
│       │   ├── ai_predictor.py    # Predictor: dự đoán hoàn thành
│       │   ├── ai_reviewer.py     # Reviewer: đánh giá cuối ngày + Life Score
│       │   └── energy_manager.py  # Energy: quản lý năng lượng
│       ├── services/
│       │   ├── __init__.py
│       │   └── gamification.py    # EXP, streak, achievement logic
│       └── routers/
│           ├── __init__.py
│           ├── goals.py           # CRUD mục tiêu
│           ├── roadmaps.py        # CRUD lộ trình
│           ├── courses.py         # CRUD khóa học
│           ├── tasks.py           # CRUD nhiệm vụ
│           ├── sprints.py         # CRUD sprint + sprint days
│           ├── daily_logs.py      # CRUD nhật ký
│           ├── study_hours.py     # CRUD giờ học
│           ├── gamification.py    # Player, EXP, achievements
│           ├── vocabulary.py      # CRUD từ vựng
│           ├── ipa.py             # CRUD IPA
│           ├── exports.py         # Excel, PDF, CSV export
│           └── ai.py              # 13 AI API endpoints
│
└── frontend/                      # React Frontend
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── vitest.config.ts           # Vitest config
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.node.json
    ├── index.html
    └── src/
        ├── main.tsx               # Entry point
        ├── App.tsx                # Root với lazy loading
        ├── index.css              # Tailwind + CSS variables
        ├── vite-env.d.ts
        ├── __tests__/
        │   └── setup.ts           # Vitest setup (jsdom)
        │
        ├── components/
        │   ├── ui/                # 18 shadcn/ui components
        │   │   ├── badge.tsx
        │   │   ├── button.tsx
        │   │   ├── card.tsx
        │   │   ├── checkbox.tsx
        │   │   ├── dialog.tsx
        │   │   ├── input.tsx
        │   │   ├── label.tsx
        │   │   ├── popover.tsx
        │   │   ├── progress.tsx
        │   │   ├── scroll-area.tsx
        │   │   ├── select.tsx
        │   │   ├── separator.tsx
        │   │   ├── skeleton.tsx
        │   │   ├── switch.tsx
        │   │   ├── table.tsx
        │   │   ├── tabs.tsx
        │   │   ├── textarea.tsx
        │   │   └── tooltip.tsx
        │   │
        │   ├── ai/                # 🧠 AI Components
        │   │   ├── AIChatDialog.tsx      # Chat với AI Coach
        │   │   ├── AIPlannerButton.tsx   # Nút + modal kế hoạch AI
        │   │   ├── AIReviewCard.tsx      # Review card AI
        │   │   ├── LifeScoreGauge.tsx    # Điểm cuộc sống gauge
        │   │   └── PredictionCard.tsx    # Dự đoán mục tiêu
        │   │
        │   ├── journey/
        │   │   └── JourneyMap.tsx        # Journey 2.0 map (zones, avatar)
        │   │
        │   ├── notifications/
        │   │   └── NotificationBell.tsx   # Chuông thông báo
        │   │
        │   ├── layout/
        │   │   ├── AppLayout.tsx   # Layout chính
        │   │   ├── Sidebar.tsx     # Sidebar navigation
        │   │   └── Topbar.tsx      # Top bar
        │   │
        │   ├── gamification/
        │   │   ├── AchievementCard.tsx  # Card thành tựu
        │   │   ├── ExpBar.tsx          # Thanh EXP
        │   │   ├── LevelBadge.tsx      # Huy hiệu level
        │   │   └── StreakDisplay.tsx   # Hiển thị streak
        │   │
        │   ├── common/
        │   │   ├── EmptyState.tsx      # Empty state
        │   │   ├── ExpPopup.tsx        # Popup +EXP animation
        │   │   ├── LoadingSkeleton.tsx  # Skeleton loading
        │   │   └── PageHeader.tsx      # Header trang
        │   │
        │   └── CommandPalette.tsx      # Ctrl+K command palette
        │
        ├── pages/                # 12 pages (lazy loaded)
        │   ├── Dashboard.tsx     # Bảng điều khiển + AI predictions
        │   ├── Journey.tsx       # Hành trình 2.0 (zones, avatar spring)
        │   ├── Roadmap.tsx       # Lộ trình tree view
        │   ├── SprintPlanner.tsx # Kế hoạch Sprint
        │   ├── DailyPlan.tsx     # Kế hoạch hôm nay + AI banner
        │   ├── DailyReport.tsx   # Báo cáo cuối ngày + AI review
        │   ├── Backlog.tsx       # Kho ý tưởng
        │   ├── Statistics.tsx    # Thống kê biểu đồ
        │   ├── AICoach.tsx       # 🧠 AI Coach chat page
        │   ├── Export.tsx        # Xuất dữ liệu
        │   ├── Vocabulary.tsx    # Từ vựng
        │   └── IPA.tsx           # Bảng IPA
        │
        ├── hooks/
        │   ├── usePlayer.ts           # Hook player state
        │   └── useKeyboardShortcuts.ts # Phím tắt (Ctrl+K, G→D,...)
        │
        ├── services/            # TanStack Query hooks + API
        │   ├── api.ts           # Axios instance
        │   ├── aiService.ts     # AI endpoints (planner, chat, life-score,...)
        │   ├── goalService.ts
        │   ├── roadmapService.ts
        │   ├── courseService.ts
        │   ├── taskService.ts
        │   ├── sprintService.ts
        │   ├── dailyLogService.ts
        │   ├── studyHourService.ts
        │   ├── gamificationService.ts
        │   ├── vocabularyService.ts
        │   ├── ipaService.ts
        │   ├── backlogService.ts
        │   └── exportService.ts
        │
        ├── types/
        │   └── index.ts        # TypeScript interfaces
        │
        ├── constants/
        │   └── index.ts        # EXP rewards, levels, achievements
        │
        ├── store/
        │   └── gameStore.ts    # Game state (popup queue)
        │
        ├── contexts/
        │   └── ThemeContext.tsx # Dark/Light mode
        │
        ├── lib/
        │   └── utils.ts        # cn() utility
        │
        └── utils/
            └── index.ts        # Helper functions
```

---

## Cơ Sở Dữ Liệu

### 14 Tables (Phase 1 - Base)

| STT | Table | Mô tả | Các cột chính |
|-----|-------|-------|---------------|
| 1 | `goals` | Mục tiêu học tập | id, name, type (gpa/ielts/devops), target_value, current_value, deadline, priority, progress_percent |
| 2 | `roadmap_items` | Chi tiết lộ trình | id, goal_type, title, description, order_index, deadline, is_completed, icon |
| 3 | `courses` | Khóa học | id, name, description, goal_type, total_hours, completed_hours |
| 4 | `tasks` | Nhiệm vụ | id, title, description, goal_type, date, start_time, end_time, status, priority, exp_reward |
| 5 | `sprints` | Sprint | id, name, start_date, end_date, goal_type, status |
| 6 | `sprint_days` | Ngày trong sprint | id, sprint_id (FK), date, activity, is_compulsory, time_range, note |
| 7 | `daily_logs` | Nhật ký cuối ngày | id, date (unique), completion_percent, sleep_hours, mood_level, energy_level, note |
| 8 | `study_hours` | Giờ học | id, date, goal_type, hours |
| 9 | `players` | Người chơi (Game) | id, level, exp, coins, streak, last_streak_date |
| 10 | `achievements` | Thành tựu | id, player_id (FK), code, name, description, icon, unlocked_at |
| 11 | `levels` | Định nghĩa cấp độ | id, level (unique), exp_required, title |
| 12 | `vocabulary` | Từ vựng | id, word, meaning, example, category |
| 13 | `ipa` | Ký hiệu IPA | id, symbol (unique), description, example_word |
| 14 | `backlog_items` | Kho ý tưởng | id, title, description, category, priority, status |

---

## API Endpoints

### Mục tiêu (Goals)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/goals` | Danh sách mục tiêu |
| POST | `/api/goals` | Tạo mục tiêu |
| PUT | `/api/goals/{id}` | Cập nhật mục tiêu |
| DELETE | `/api/goals/{id}` | Xóa mục tiêu |

### Lộ trình (Roadmaps)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/roadmaps?goal_type=` | Danh sách lộ trình |
| POST | `/api/roadmaps` | Thêm mục lộ trình |
| PUT | `/api/roadmaps/{id}` | Cập nhật |
| DELETE | `/api/roadmaps/{id}` | Xóa |

### Nhiệm vụ (Tasks)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/tasks?date=&status=&goal_type=` | Lọc nhiệm vụ |
| POST | `/api/tasks` | Tạo nhiệm vụ |
| PUT | `/api/tasks/{id}` | Cập nhật |
| DELETE | `/api/tasks/{id}` | Xóa |

### Sprint
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/sprints` | Danh sách sprint |
| POST | `/api/sprints` | Tạo sprint |
| GET | `/api/sprint-days?sprint_id=` | Ngày trong sprint |
| POST | `/api/sprint-days` | Tạo sprint day |
| PATCH | `/api/sprint-days/{id}` | Cập nhật sprint day |
| DELETE | `/api/sprint-days/{id}` | Xóa sprint day |

### Nhật ký (Daily Logs)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/daily-logs?date=` | Nhật ký theo ngày |
| GET | `/api/daily-logs/latest` | Nhật ký mới nhất |
| POST | `/api/daily-logs` | Tạo nhật ký |
| PUT | `/api/daily-logs/{id}` | Cập nhật |
| DELETE | `/api/daily-logs/{id}` | Xóa |

### Giờ học (Study Hours)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/study-hours?date_from=&date_to=` | Lọc giờ học |
| GET | `/api/study-hours/weekly` | Thống kê tuần |
| POST | `/api/study-hours` | Thêm giờ học |

### Game (Player)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/player` | Thông tin người chơi |
| POST | `/api/player/add-exp` | Cộng EXP |
| POST | `/api/player/add-coins` | Cộng coins |
| POST | `/api/player/update-streak` | Cập nhật streak |
| POST | `/api/player/check-streak` | Kiểm tra & cập nhật streak tự động |
| POST | `/api/player/unlock-achievement` | Mở khóa thành tựu |
| GET | `/api/achievements` | Danh sách thành tựu |
| GET | `/api/levels` | Định nghĩa cấp độ |

### Từ vựng & IPA
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/POST | `/api/vocabulary` | CRUD từ vựng |
| GET/PUT/DELETE | `/api/vocabulary/{id}` | Chi tiết từ |
| GET/POST | `/api/ipa` | CRUD IPA |
| GET/PUT/DELETE | `/api/ipa/{id}` | Chi tiết IPA |

### Backlog
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/backlog?status=&category=` | Lọc backlog |
| POST | `/api/backlog` | Thêm ý tưởng |
| PUT | `/api/backlog/{id}` | Cập nhật |
| DELETE | `/api/backlog/{id}` | Xóa |

### Export
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/exports/excel` | Xuất Excel (.xlsx) |
| GET | `/api/exports/pdf` | Xuất PDF |
| GET | `/api/exports/csv/{table}` | Xuất CSV từng bảng |

### AI Endpoints 🧠 (13 routes)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/ai/planner` | Tạo kế hoạch học tập (energy, sleep, mood) |
| GET | `/api/ai/brain/{goal_type}` | Vị trí hiện tại + bài tiếp theo + mastery |
| POST | `/api/ai/track` | Ghi nhận hoạt động học |
| GET | `/api/ai/predictions` | Dự đoán tất cả mục tiêu |
| GET | `/api/ai/predict/{goal_type}` | Dự đoán một mục tiêu cụ thể |
| GET | `/api/ai/review/daily` | Đánh giá cuối ngày |
| GET | `/api/ai/review/weekly` | Báo cáo tuần |
| POST | `/api/ai/chat` | Chat với AI Coach |
| GET | `/api/ai/chat/history/{session_id}` | Lịch sử chat |
| GET | `/api/ai/life-score` | Điểm cuộc sống (Life Score) |
| GET | `/api/ai/stats` | Thống kê tổng quan 7 ngày |
| GET | `/api/ai/notifications` | Danh sách thông báo |
| POST | `/api/ai/notifications/read/{id}` | Đánh dấu đã đọc |

---

## Các Trang Giao Diện (12 pages)

### 1. Dashboard (`/`) 🏠
- **Xin chào** + lời chào theo thời gian (sáng/chiều/tối)
- **Đồng hồ live** (HH:MM:SS)
- **Thông số người chơi**: Level, EXP bar, Coins, Streak 🔥
- **AI Life Score gauge** + Prediction cards
- **4 thẻ thống kê**: Thời gian học hôm nay, GPA, IELTS, DevOps
- **3 thẻ tiến độ**: Progress bar + block visual (████░░░░)
- **Danh sách nhiệm vụ hôm nay** với checkbox toggle (kèm +20 EXP popup)
- **Biểu đồ cột tuần** (Recharts) - stacked IELTS/GPA/DevOps
- **Thao tác nhanh**: Lên kế hoạch AI, Ghi nhật ký, Xem thống kê

### 2. Hành Trình 2.0 (`/journey`) ⭐
**Trang quan trọng nhất, KHÔNG có progress bar.**

- **3 zone** theo goal (GPA/IELTS/DevOps) với thiết kế riêng
- **Timeline ngang** với animation avatar (🚶/🏃/🎉)
- Avatar di chuyển dọc đường đua (spring physics: stiffness=100, damping=20)
- **Mốc GPA**: 2.36 → 2.50 → 2.70 → 2.80 → 3.00
- **Mốc IELTS**: 4.0 → 4.5 → 5.0 → 5.5 → 6.0 → 6.5
- **Mốc DevOps**: 🐧 Linux → 🌐 Git → 🔗 Networking → 🐳 Docker → 📦 Docker Compose → 🔄 CI/CD → ☁ AWS → ☸ Kubernetes → 📝 Terraform → 🚀 DevOps Engineer
- Hiệu ứng confetti khi đạt mốc mới
- Danh sách milestone phía dưới

### 3. Lộ Trình (`/roadmap`)
- **3 tab**: GPA, IELTS, DevOps
- **Tổng quan tiến độ** đầu mỗi tab
- **Tree view** với checkbox và icon
- Badge deadline (cảnh báo màu khi gần hạn)
- Sort theo thứ tự / hạn chót
- Filter all / hoàn thành / chưa xong
- Dialog thêm mục mới

### 4. Sprint (`/sprint`)
- **Form tạo Sprint**: Tên, ngày bắt đầu, ngày kết thúc, loại mục tiêu
- **Danh sách Sprint**: Card expandable
- **Chi tiết Sprint**: Grid ngày với inline editing
- Mỗi ngày: activity, time range, compulsory switch, note
- Thêm/xóa ngày

### 5. Kế Hoạch Hôm Nay (`/daily-plan`)
- **Đồng hồ live** + ngày hôm nay
- **AI Banner** gợi ý kế hoạch thông minh dựa trên năng lượng
- **Time blocks** dạng timeline:
  ```
  09:00-09:45  IPA
  /iː/ /ɪ/ /e/ /æ/
  ◉ Đang làm
  ```
- **Status toggle animation**: ☐ → ◉ → ☑ (scale animation)
- **+EXP popup** khi hoàn thành block (EXP theo difficulty)
- Dialog thêm/sửa block
- **Nút AI Planner** (⚡) floating để tạo plan tự động

### 6. Báo Cáo (`/daily-report`)
- **Date picker** (mặc định hôm nay)
- **Form nhập**: Hoàn thành % (slider), Ngủ (slider), Tâm trạng (1-10), Năng lượng (1-10), Ghi chú
- **AI Review Card**: Rating, strengths, weaknesses, suggestions
- **View mode**: Progress ring, stats display
- **Tổng quan ngày**: Tasks completed, study hours, EXP earned
- Edit/Delete

### 7. AI Coach (`/ai-coach`) 🧠
- **Chat interface** với AI Coach (tiếng Việt)
- AI tự suy luận, phân tích lịch sử học tập
- Nhận diện cảm xúc (mệt/chán/tiến độ)
- Gợi ý kế hoạch, động viên, giải thích
- Lưu lịch sử theo session

### 8. Backlog (`/backlog`)
- **Danh sách ý tưởng**: Search, filter category, filter status
- **Card grid**: Title, description, category badge, priority badge, status
- **Status progression**: Trong kho → Đang thực hiện → Đã hoàn thành
- **Đưa vào Sprint**: Chọn sprint từ dialog
- Add dialog với zod validation

### 9. Thống Kê (`/statistics`)
- **Period tabs**: Ngày, Tuần, Tháng, Năm
- **4 summary cards**: IELTS, GPA, DevOps, Tổng cộng
- **Stacked bar chart** (Recharts)
- **Bảng chi tiết** theo ngày
- **Progress overview** goals

### 10. Export (`/export`)
- **Excel**: Xuất tất cả dữ liệu
- **PDF**: Báo cáo học tập
- **CSV**: Chọn bảng → xuất
- Loading spinner, toast success/error

### 11. Từ Vựng (`/vocabulary`)
- Card grid từ vựng
- Search, filter category
- CRUD (thêm/sửa/xóa)

### 12. IPA (`/ipa`)
- Grid ký hiệu IPA
- Symbol, description, example word
- CRUD

---

## Hệ Thống Gamification (Game Hóa)

### Level & EXP
| Cấp độ | Title | EXP yêu cầu |
|--------|-------|-------------|
| Lv 1 | Tân Thủ | 0 |
| Lv 2 | Người Học | 100 |
| Lv 3 | Học Viên | 300 |
| Lv 4 | Người Cố Gắng | 600 |
| Lv 5 | Người Kiên Trì | 1000 |
| Lv 6 | Chiến Binh | 1500 |
| Lv 7 | Hiệp Sĩ | 2100 |
| Lv 8 | Nhà Vô Địch | 2800 |
| Lv 9 | Bậc Thầy | 3600 |
| Lv 10 | Huyền Thoại | 4500 |

### Cách nhận EXP
| Hành động | EXP |
|-----------|-----|
| Hoàn thành block IPA | +10 |
| Hoàn thành block Vocabulary | +15 |
| Hoàn thành block Listening | +30 |
| Hoàn thành block Linux | +40 |
| Hoàn thành block Docker | +70 |
| Hoàn thành block AWS | +90 |
| Hoàn thành block Kubernetes | +120 |
| Ghi nhật ký cuối ngày | +100 |
| Streak 3 ngày | +150 |
| Streak 7 ngày | +300 |
| Streak 30 ngày | +1,500 |
| Hoàn thành Sprint | +500 |
| Hoàn thành Roadmap | +2,000 |
| Dọn backlog | +50 |

### Streak 🔥
- **Mỗi ngày** có activity (task hoặc daily log): +1 streak
- **Bỏ 1 ngày**: Streak reset về 0
- **Streak 7 ngày**: +300 EXP + Achievement "Kiên Trì"

### Achievement (10 thành tựu)
| Tên | Code | Điều kiện | Icon |
|-----|------|-----------|------|
| Bước Đầu Tiên | `first_task` | Hoàn thành nhiệm vụ đầu tiên | 🎯 |
| Tuần Luyện Tập | `streak_7` | Streak 7 ngày | 🔥 |
| Tháng Kiên Trì | `streak_30` | Streak 30 ngày | 💪 |
| Chiến Binh Sprint | `sprint_master` | Hoàn thành 1 sprint | ⚔️ |
| Cơn Sốt Vàng | `gold_rush` | 1000 coins | 🪙 |
| Đa Ngôn Ngữ | `polyglot` | 100 từ vựng | 📚 |
| Đệ Tử Chân Truyền | `level_5` | Level 5 | ⭐ |
| Bậc Thầy | `level_10` | Level 10 | 👑 |
| Vạch Đến Đích | `roadmap_done` | Hoàn thành lộ trình | 🗺️ |
| Cú Đêm | `night_owl` | Học sau 10h tối 7 lần | 🦉 |

### Coins 🪙
- Nhận coins = EXP / 2
- Dùng để: (future) mở khóa tính năng, đổi phần thưởng

---

## Animation (Framer Motion)

### Trang Journey
- **Avatar di chuyển**: Spring physics (`type: "spring", stiffness: 100, damping: 20`)
- **Milestone pop-in**: Scale từ 0 → 1 khi scroll vào
- **Confetti**: Particle effect khi đạt milestone mới

### Dashboard
- **Stagger cards**: Mỗi card xuất hiện cách nhau 0.1s
- **Skeleton loading**: Shimmer effect

### Daily Plan
- **Status toggle**: Scale animation khi chuyển trạng thái
- **+20 EXP popup**: Float up + fade out

### Chung
- **Page transitions**: Fade + slide
- **Hover effects**: Scale + shadow
- **List items**: Stagger children

---

## Dark Mode

- **Mặc định**: Dark mode
- **CSS Variables**: shadcn/ui theming
- **Lưu**: localStorage
- **Toggle**: Sun/Moon icon ở sidebar
- **Class**: `dark` class trên `<html>`

---

## Responsive Design

| Thiết bị | Sidebar | Layout |
|-----------|---------|--------|
| Desktop (≥1024px) | Hiển thị | 3-4 columns |
| Tablet (768-1023px) | Ẩn, hamburger menu | 2 columns |
| Mobile (<768px) | Ẩn, overlay | 1 column |

---

## Code Splitting

Frontend được chia thành 9 chunks riêng biệt:

| Chunk | Kích thước | Nội dung |
|-------|-----------|----------|
| `vendor` | 40 kB | React, ReactDOM |
| `query` | 50 kB | TanStack Query |
| `motion` | 114 kB | Framer Motion |
| `charts` | 381 kB | Recharts |
| `ui` | 78 kB | shadcn/ui components |
| `types` | 90 kB | Constants, types |
| `select` | 22 kB | Select component |
| Page chunks | ~15-30 kB mỗi | Lazy loaded pages |

---

## Seed Data (Dữ liệu mẫu)

### Levels (10 cấp độ)
Tân Thủ → Người Học → Học Viên → Người Cố Gắng → Người Kiên Trì → Chiến Binh → Hiệp Sĩ → Nhà Vô Địch → Bậc Thầy → Huyền Thoại

### Goals (3 mục tiêu)
1. GPA 3.0 (hiện tại: 2.5, hạn: 31/12/2026)
2. IELTS 6.5 (hiện tại: 4.5, hạn: 30/09/2026)
3. DevOps 100% (hiện tại: 25%, hạn: 31/12/2026)

### Roadmap Items (10+ items)
- GPA: Ôn tập, Luyện đề, Nhóm học tập
- IELTS: Từ vựng, Luyện nghe, Luyện nói, Luyện viết
- DevOps: Linux 🐧, Docker 🐳, CI/CD 🔄

### Roadmap Lessons (30+ bài học, 10/goal type)
- **GPA**: Đại số tuyến tính → Giải tích → Xác suất → Vật lý → Hóa học → Toán rời rạc → Kinh tế → Triết học → Tiếng Anh chuyên ngành → Đồ án tốt nghiệp
- **IELTS**: Vocabulary Foundation → Grammar → Reading Techniques → Listening Skills → Speaking Part 1 → Writing Task 1 → Speaking Part 2 → Writing Task 2 → Speaking Part 3 → Mock Test
- **DevOps**: Linux Basics → Git & GitHub → Networking → Docker → Docker Compose → CI/CD → AWS → Kubernetes → Terraform → Monitoring

### Achievements (7 thành tựu)
FIRST_TASK, STREAK_7, LEVEL_5, LEVEL_10, STUDY_50, SPRINT_MASTER, DAILY_30

### Tasks (4 nhiệm vụ hôm nay)
1. Học từ vựng IELTS (08:00-09:00)
2. Luyện nghe tiếng Anh (09:30-10:30)
3. Ôn tập môn Toán (14:00-16:00)
4. Học Docker cơ bản (20:00-21:30)

### Current Positions (3 vị trí)
- GPA: Module 2 (Giải tích), progress 30%
- IELTS: Module 3 (Reading Skills), progress 15%
- DevOps: Module 2 (Git & GitHub), progress 50%

### Smart Notifications (5 thông báo)
- Chào mừng đến LIFE QUEST
- Đừng quên học hôm nay
- Tip: Học 25 phút, nghỉ 5 phút
- Kiểm tra tiến độ cuối tuần
- Nghỉ ngơi hợp lý

### User Statistics (7 ngày gần nhất)
- Dữ liệu học tập 7 ngày (study hours, tasks completed, EXP earned)

---

## Docker

### docker-compose.yml
```yaml
services:
  backend:   # FastAPI on :8000
  frontend:  # Vite on :5173
```

### Cách chạy

#### 1-Click Start (Khuyên dùng - Windows)

Mở **cmd.exe** (Command Prompt), chạy:

```cmd
start.bat
```

Script sẽ tự động:
1. Kill port cũ (nếu có)
2. Start Backend (http://localhost:8000)
3. Start Frontend (http://localhost:5173)
4. Mở API Docs (http://localhost:8000/docs)

Để dừng: chạy `stop.bat` hoặc CTRL+C.

### Docker
```bash
docker-compose up
```

### Thủ công - PowerShell
```powershell
# Terminal 1 - Backend
cd backend
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

### Thủ công - CMD
```cmd
rem Terminal 1 - Backend
cd backend && pip install -r requirements.txt && python seed.py && uvicorn app.main:app --reload

rem Terminal 2 - Frontend
cd frontend && npm install && npm run dev
```

### URL
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs (Swagger UI)

---

## Yêu Cầu Hệ Thống

- **Node.js** >= 20
- **Python** >= 3.10
- **Docker** (optional)
- **npm** hoặc yarn

---

---

## Phase 2 - AI Upgrade 🧠

### AI Brain (`backend/app/ai/ai_brain.py`)
- **track_learning()**: Ghi lại hoạt động học tập, cập nhật BrainMemory (progress, mastery)
- **get_next_lesson()**: Suy luận bài học tiếp theo dựa trên RoadmapLesson và lịch sử
- **update_current_position()**: Cập nhật vị trí hiện tại (module, lesson, progress)
- **get_mastery_summary()**: Tổng quan mức độ thành thạo theo goal_type

### AI Planner (`backend/app/ai/ai_planner.py`)
- **generate_daily_plan()**: Tự động lên kế hoạch học tập trong ngày
- **Đầu vào**: energy_level, sleep_hours, mood
- **Đầu ra**: summary, reason, priority list, time blocks (start/end/goal_type/title/description/difficulty/energy_cost/exp_reward), remaining energy, predicted completion
- **adjust_plan_for_energy()**: Điều chỉnh kế hoạch nếu năng lượng thấp

### AI Predictor (`backend/app/ai/ai_predictor.py`)
- **calculate_pace()**: Tính tốc độ học trung bình (giờ/ngày) dựa trên StudyHour
- **predict_goal_completion()**: Dự đoán thời điểm hoàn thành mục tiêu
- **Trả về**: current_pace, predicted_date, confidence (high/medium/low), recommendation

### AI Reviewer (`backend/app/ai/ai_reviewer.py`)
- **generate_daily_review()**: Tạo báo cáo đánh giá cuối ngày
- **Trả về**: rating (1-10), completion_percent, strengths/weaknesses/suggestions
- **calculate_life_score()**: Tính điểm cuộc sống tổng hợp
- **Công thức**: (IELTS% + GPA% + DevOps%)/3 + streak_bonus + achievement_bonus + level_bonus

### Energy System (`backend/app/ai/energy_manager.py`)
- **get_energy_for_task()**: Tính năng lượng cần cho nhiệm vụ
- **get_max_energy()**: Năng lượng tối đa dựa trên giờ ngủ
- **get_remaining_energy()**: Năng lượng còn lại sau các task đã làm
- **can_do_task()**: Kiểm tra đủ năng lượng

### Life Score
- Điểm tổng hợp từ: tiến độ mục tiêu, streak, achievement, level
- Công thức: IELTS×0.3 + GPA×0.3 + DevOps×0.2 + streak_bonus + level_bonus + achievement_bonus
- Lưu vào bảng `life_score_history` để theo dõi xu hướng
- API: `GET /api/ai/life-score`

### AI Chat
- API: `POST /api/ai/chat` với message + session_id
- Nhận diện từ khóa: mệt, chán, tiến độ, kế hoạch, điểm, đánh giá, năng lượng
- Trả lời thông minh bằng tiếng Việt
- Lưu lịch sử vào bảng `ai_conversations`
- API: `GET /api/ai/chat/history/{session_id}`

### Journey 2.0 Map
- 3 tab: GPA, IELTS, DevOps
- Timeline ngang với avatar animation (spring physics)
- Milestone markers với milestone pop-in effect
- Confetti khi đạt milestone mới
- Avatar di chuyển dọc đường đua theo tiến độ thực tế

### Command Palette
- Mở bằng `Ctrl+K` hoặc `Cmd+K`
- Tìm kiếm commands, pages, goals
- Điều hướng nhanh, tạo task nhanh, xem thống kê nhanh
- Dark mode toggle

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Mở Command Palette |
| `1-9` | Chuyển tab |
| `G → D` | Go tới Dashboard |
| `G → J` | Go tới Journey |
| `G → R` | Go tới Roadmap |
| `G → S` | Go tới Sprint |

### Smart Notifications
- Bảng `smart_notifications`: title, message, type (welcome/daily/tip/reminder/achievement), is_read, scheduled_at
- Seed: 5 thông báo mẫu (chào mừng, nhắc nhở, tip, kiểm tra, nghỉ ngơi)
- API: `GET/POST /api/notifications`, `PATCH /api/notifications/{id}/read`

### New Database Tables (Phase 2)
| STT | Table | Mô tả |
|-----|-------|-------|
| 15 | `brain_memory` | Lưu trạng thái học tập & mastery |
| 16 | `learning_history` | Lịch sử hoạt động học tập |
| 17 | `current_positions` | Vị trí hiện tại theo từng mục tiêu |
| 18 | `roadmap_lessons` | Chi tiết bài học trong roadmap (30+ lessons) |
| 19 | `ai_conversations` | Lịch sử chat với AI |
| 20 | `predictions` | Dự đoán hoàn thành mục tiêu |
| 21 | `weekly_reports` | Báo cáo tuần |
| 22 | `user_statistics` | Thống kê người dùng |
| 23 | `smart_notifications` | Thông báo thông minh |
| 24 | `life_score_history` | Lịch sử điểm cuộc sống |

### Tests
- `backend/tests/test_ai.py`: 9 unit tests cho AI modules (Energy, Predictor, Planner, Reviewer, Brain)
- `backend/tests/test_api.py`: 8 integration tests cho API endpoints (root, goals, player, AI planner, life-score, predictions, review, chat)
- `frontend/src/__tests__/setup.ts`: Vitest setup (jsdom, @testing-library/jest-dom)
- `frontend/vitest.config.ts`: Vitest config với React plugin, path alias
- Chạy test: `python -m pytest tests/ -v` (backend), `npm test` (frontend)

---

## Phase 3 - AI Learning Operating System 🧠⚡

### Phase 3.1 – Backend AI Engine V2 (hoàn thành)

#### 14 Database Tables Mới (`models_v2.py`)
| STT | Table | Mô tả |
|-----|-------|-------|
| 25 | `spaced_repetition` | Lịch ôn tập 1-3-7-14-30-60-120 ngày, mastery, retention |
| 26 | `knowledge_graph` | Đồ thị kiến thức (prerequisites: Linux→Permissions→Docker→K8s...) |
| 27 | `learning_patterns` | Pattern học tập (giờ học hiệu quả, môn bỏ, lỗi thường gặp) |
| 28 | `learning_insights` | Insight tự động (trend improving/declining, recommendations) |
| 29 | `focus_scores` | Focus Score 0-100 (sleep + completion + time + mood + energy) |
| 30 | `mental_energy_logs` | Cognitive load log (IPA=15, Writing=90, Docker=70, K8s=90) |
| 31 | `quests` | Nhiệm vụ game (Daily: 3, Weekly: 3, Monthly: 2) |
| 32 | `quest_progress` | Tiến độ quest theo ngày |
| 33 | `boss_fights` | Boss cuối sprint (IELTS Mock Test, DevOps Project, GPA Quiz) |
| 34 | `shop_items` | Cửa hàng (10 items: themes, avatars, animations, auras, boost) |
| 35 | `purchases` | Lịch sử mua hàng |
| 36 | `avatar_state` | Trạng thái avatar (6 stages, expression, accessory, aura, theme) |
| 37 | `virtual_coach_messages` | Tin nhắn AI Coach chủ động (sleep/skip/review/priority/energy) |
| 38 | `learning_activities` | Hoạt động học chi tiết (date, goal_type, module, lesson, duration, score) |

#### 15 AI Service Modules Mới (`backend/app/ai/`)
| Module | File | Chức năng chính |
|--------|------|-----------------|
| Spaced Repetition | `spaced_repetition.py` | Lịch ôn tập 1-3-7-14-30-60-120 ngày, tính mastery = retention×review_count/max_count |
| Knowledge Graph | `knowledge_graph.py` | 16 edges seed: Linux→Permissions→Docker→K8s; `can_unlock()` kiểm tra prerequisite |
| Priority Engine | `priority_engine.py` | Score = deadline×0.25 + gap×0.20 + progress×0.15 + energy×0.15 + retention×0.10 + importance×25 |
| Adaptive Difficulty | `adaptive_difficulty.py` | Tự động ±1 difficulty khi score ≥80 hoặc <40 trong 2+ lần |
| Mental Energy | `mental_energy.py` | Cognitive load type-based (IPA=15, Vocabulary=20, Docker=70, Writing=90...), sequence optimizer |
| Learning Insight | `learning_insight.py` | Phát hiện môn bỏ, giờ học hiệu quả, lỗi thường gặp, trend analysis |
| Focus Score | `focus_score.py` | Score 0-100 = sleep_score×0.25 + completion×0.20 + time×0.15 + mood×0.20 + energy×0.20 |
| Smart Streak | `smart_streak.py` | Recovery Day (mood≤3/energy≤3/sick), max 3 lần, không mất streak |
| Virtual Coach | `virtual_coach.py` | Tự động sinh lời khuyên mỗi ngày (sleep, skip, review, priority, energy) |
| Predictor V2 | `predictor_v2.py` | 3 kịch bản (giữ pace/tăng 30ph/bỏ 3 ngày), confidence %, trend, recommendation |
| Reflection | `reflection.py` | Weekly report tự động: strengths, weaknesses, root causes, recommendations |
| Quest System | `quest_system.py` | 8 quests (3 daily + 3 weekly + 2 monthly), auto-check progress, EXP+coin rewards |
| Boss System | `boss_system.py` | Boss templates per goal, spawn/defeat flow, boss HP dựa trên task count |
| Shop | `shop.py` | 10 items (theme skins, avatar skins, achievements, animation, aura, boost), purchase + equip |
| Avatar Evolution | `avatar_evolution.py` | 6 stages (Tân Thủ→Người Học→Nhà Thám Hiểm→Chuy�n Gia→Bậc Thầy→Huyền Thoại), auto-evolution |
| Visualization | `visualization.py` | Heatmap 365 ngày (5 levels intensity) + Life Timeline từ tasks |

#### 31 API Endpoints V2 (`/api/ai/v2/...`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/dashboard` | Dashboard proactive AI (coach_message, focus_score, life_score, priorities) |
| GET | `/repetition/due` | Danh sách bài cần ôn tập hôm nay |
| GET | `/repetition/{goal_type}` | Tất cả lịch ôn tập theo goal |
| POST | `/repetition/review` | Ghi nhận ôn tập + tính mastery |
| GET | `/repetition/stats` | Thống kê ôn tập tổng quan |
| GET | `/knowledge/{goal_type}` | Đồ thị kiến thức theo goal |
| GET | `/knowledge/can-unlock` | Kiểm tra có thể mở bài không |
| GET | `/priority` | Priority ranking tất cả mục tiêu |
| GET | `/adaptive-difficulty/{goal_type}` | Difficulty hiện tại + history |
| GET | `/mental-energy/load/{task_type}` | Cognitive load của loại task |
| POST | `/mental-energy/optimize` | Tối ưu lịch học theo energy |
| GET | `/mental-energy/break-suggestion` | Gợi ý nghỉ ngơi |
| GET | `/insights/{goal_type}` | Learning insights + trend |
| POST | `/insights/schedule` | Tạo lịch học tối ưu |
| GET | `/focus` | Focus Score hôm nay |
| GET | `/focus/trend` | Biểu đồ focus 7 ngày |
| GET | `/streak` | Smart Streak info |
| POST | `/streak/recovery` | Kích hoạt Recovery Day |
| GET | `/coach` | Virtual Coach messages đang active |
| POST | `/coach/generate` | Sinh coach message mới |
| POST | `/coach/dismiss/{id}` | Đánh dấu đã đọc |
| GET | `/predict-v2` | Enhanced predictions (3 scenarios) |
| GET | `/reflection` | Weekly AI reflection report |
| GET | `/quests` | Danh sách quest đang active |
| POST | `/quests/check` | Kiểm tra + reward quests |
| GET | `/bosses/{goal_type}` | Boss hiện tại |
| POST | `/bosses/spawn` | Tạo boss mới |
| POST | `/bosses/defeat` | Đánh bại boss + reward |
| GET | `/shop` | Danh sách shop items |
| POST | `/shop/buy/{item_id}` | Mua item |
| GET | `/inventory` | Kho đồ đã mua |
| POST | `/inventory/equip/{purchase_id}` | Trang bị item |
| GET | `/avatar` | Thông tin avatar hiện tại |
| POST | `/avatar/check-evolution` | Kiểm tra tiến hóa |
| POST | `/avatar/expression` | Đổi biểu cảm avatar |
| GET | `/heatmap` | Heatmap contribution graph |
| GET | `/timeline` | Life Timeline scrollable |

### Kiến Trúc Mới

```
backend/app/
├── models_v2.py          # 14 ORM models Phase 3 (193 dòng)
├── schemas_v2.py         # 20+ Pydantic schemas V2 (234 dòng)
├── ai/                   # 🧠 16 AI modules (5 cũ + 11 mới)
│   ├── spaced_repetition.py    # Lịch ôn tập
│   ├── knowledge_graph.py      # Đồ thị kiến thức
│   ├── priority_engine.py      # Priority scoring
│   ├── adaptive_difficulty.py  # Tự động điều chỉnh độ khó
│   ├── mental_energy.py        # Cognitive load optimizer
│   ├── learning_insight.py     # Phân tích pattern học
│   ├── focus_score.py          # Focus Score
│   ├── smart_streak.py         # Recovery Day
│   ├── virtual_coach.py        # AI Coach chủ động
│   ├── predictor_v2.py         # Enhanced prediction
│   ├── reflection.py           # Weekly reflection
│   ├── quest_system.py         # Quest gamification
│   ├── boss_system.py          # Boss fight
│   ├── shop.py                 # Shop + Inventory
│   ├── avatar_evolution.py     # Avatar 6 stages
│   └── visualization.py        # Heatmap + Timeline
└── routers/
    └── ai_v2.py          # 31 V2 API endpoints (297 dòng)
```

### Các Thuật Toán Quan Trọng

**Priority Score**: `deadline_weight×0.25 + learning_gap×0.20 + progress_factor×0.15 + energy_factor×0.15 + retention_factor×0.10 + importance×25`

**Focus Score**: `sleep_score×0.25 + completion×0.20 + time_score×0.15 + mood_score×0.20 + energy_score×0.20`

**Mental Energy (Cognitive Load)**:
| Task Type | Load |
|-----------|------|
| IPA | 15 |
| Vocabulary | 20 |
| Reading | 30 |
| Listening | 40 |
| Docker | 70 |
| K8s | 90 |
| Writing | 90 |

**Avatar Evolution Stages**: Tân Thủ (0EXP) → Người Học (500) → Nhà Thám Hiểm (1500) → Chuyên Gia (3000) → Bậc Thầy (5000) → Huyền Thoại (10000)

### AI Engine V2 – Rule-Based
Toàn bộ AI Engine V2 hoạt động rule-based (không cần Gemini API key):
- Spaced Repetition: intervals exponential (1→3→7→14→30→60→120 days)
- Knowledge Graph: prerequisite chain check
- Adaptive Difficulty: moving average of last 2 scores
- Smart Streak: Recovery Day when mood≤3 or energy≤3 or sick (max 3)
- Virtual Coach: template-based messages with context analysis
- Predictor V2: 3 scenarios (maintain pace / +30min/day / skip 3 days)
- Quest System: auto-check completion by comparing data
- Avatar Evolution: auto-evolve when EXP threshold reached

### Seed Data Phase 3
- **Knowledge Graph**: 16 prerequisite edges (Linux→Permissions→Docker→K8s...)
- **Quests**: 8 quests (3 Daily: học 1h, hoàn thành task, ghi nhật ký; 3 Weekly: 5h, 7 tasks, 3 daily logs; 2 Monthly: 20h, 30 tasks)
- **Shop**: 10 items (2 themes: dark_neon, ocean; 2 avatar skins: robot, samurai; 2 achievements: shopaholic, collector; 1 animation: super_saiyan; 2 auras: fire, lightning; 1 boost: exp_boost)
- **Avatar State**: 1 record player_id=1, stage=0, label=Tân Thủ

---

## Phase 3.5 – Final Evolution 🚀

### Digital Twin (`backend/app/ai/digital_twin.py`)
- Mô phỏng cách học của từng người dùng: tốc độ học, focus time, giờ hiệu quả, môn yêu thích/bỏ, tốc độ quên, khả năng tiếp thu, năng lượng TB
- Cập nhật tự động sau mỗi Daily Report (30 ngày gần nhất)
- AI Planner sử dụng Digital Twin để tối ưu lịch học
- API: `GET /api/ai/v3/twin`, `POST /api/ai/v3/twin/update`

### Risk Engine (`backend/app/ai/risk_engine.py`)
- Tính Risk Score cho từng mục tiêu: dựa trên pace hiện tại vs pace cần, trend, deadline
- Hiển thị: 🔴 High / 🟡 Medium / 🟢 Low Risk
- API: `GET /api/ai/v3/risks`, `GET /api/ai/v3/risks/{goal_type}`

### Priority Engine 2.0 (`backend/app/ai/priority_engine.py`)
- Công thức 8 yếu tố: Deadline×0.20 + Importance×20 + Gap×0.15 + Retention×0.10 + Remaining Days×0.10 + Progress×0.10 + Energy×0.05 + Risk×0.05 + Consistency×0.05
- Tích hợp Risk Score vào Priority

### Monthly Review (`backend/app/ai/monthly_review.py`)
- Báo cáo tháng: completion rate, study hours, tasks, mood, energy, sleep
- So sánh goal progress, risks, weekly reflections
- Khuyến nghị cho tháng tiếp theo
- API: `GET /api/ai/v3/monthly-review`

### Habit Detection (nâng cấp `learning_insight.py`)
- Phát hiện thói quen học: ngày học tốt nhất, giờ hiệu quả nhất, môn yêu thích, môn thường bỏ
- Phát hiện ngủ không đủ giấc (3+ lần/tuần <6h)
- API: `GET /api/ai/v3/habits`

### Gemini JSON Bridge (`backend/app/ai/gemini_bridge.py`)
- Kết nối Gemini API thật (cần GEMINI_API_KEY trong .env)
- Fallback rule-based khi không có key
- Luôn trả về JSON cấu trúc: summary, coachMessage, reason, priorityScore, blocks, prediction, risk, confidence, reviewPlan, nextLesson, warnings, motivation
- `responseMimeType: application/json` bắt buộc

### Frontend V2 Integration (4 pages mới + Dashboard nâng cấp)

#### Dashboard (`pages/Dashboard.tsx`)
- **Proactive AI Coach panel** – lời khuyên từ Virtual Coach
- **Risk Cards** – 🔴/🟡/🟢 cho từng mục tiêu
- **Focus Score gauge** – điểm tập trung 0-100
- **Priority ranking** – xếp hạng ưu tiên
- **Quest progress** – thanh tiến độ quest
- **Boss fight** – HP bar boss hiện tại
- **Digital Twin profile** – thông số học tập
- **Habit detection** – thói quen phát hiện
- **Spaced Repetition count** – số bài cần ôn

#### Quests (`pages/Quests.tsx`)
- Daily / Weekly / Monthly quest tabs
- Progress bars, EXP/coin rewards
- Boss fight card (nếu có boss active)
- Nút "Kiểm tra quest" tự động check

#### Shop (`pages/Shop.tsx`)
- Grid shop items với icon, rarity, price
- Avatar display + evolution stage
- Mua / Trang bị system
- Kiểm tra coin balance

#### Heatmap (`pages/Heatmap.tsx`)
- GitHub-style contribution graph
- Filter: 30/90/365 ngày, theo goal type
- 5 levels intensity (gray → green)

#### Timeline (`pages/Timeline.tsx`)
- Scrollable history theo ngày
- Filter: số lượng, goal type
- Status icons (✅ hoàn thành / ❌ bỏ)
- Hiển thị duration

### PWA (Progressive Web App)
- `public/manifest.json` – cấu hình PWA
- `public/sw.js` – Service Worker cache strategy
- Offline support cho static assets
- Network-first cho API (fallback cache)

### V2/V3 API Hooks (`services/aiService.ts`)
- 20+ hooks mới: useProactiveDashboard, useV2Predictions, useV2Coach, useV2Heatmap, useV2Timeline, useV2Focus, useV2Priority, useV2Quests, useV2Bosses, useV2Shop, useV2Inventory, useV2Avatar, useV2SpacedRepetition, useBuyItem, useEquipItem, useCheckQuests, useDismissCoach, useDigitalTwin, useRisks, useMonthlyReview, useHabits

### New Database Tables (Phase 3.5)
| STT | Table | Mô tả |
|-----|-------|-------|
| 39 | `digital_twins` | Digital Twin profile (learning_speed, focus_time, effective_hours, favorite_subjects, skipped_subjects, forgetting_speed, absorption_rate...) |
| 40 | `learning_activities` | Hoạt động học chi tiết (goal_type, activity_type, duration, score, energy_before/after) |

---

## Tổng Kết

| Hạng mục | Số lượng |
|-----------|---------|
| Backend source files | 35+ |
| Frontend source files | 95+ |
| Database tables | 40 (24 cũ + 14 V2 + 2 V3) |
| API endpoints | ~135 (80 cũ + 31 V2 + 7 V3) |
| UI Components | 18 shadcn/ui + 18 custom |
| Pages | 16 (12 cũ + 4 mới: Quests, Shop, Heatmap, Timeline) |
| Lines of code (est.) | ~42,000+ |
| AI Modules | 18 (5 cũ + 11 V2 + 2 V3: Digital Twin, Risk Engine, Monthly Review, Gemini Bridge) |
| AI API Endpoints | 51 (13 cũ + 31 V2 + 7 V3) |
| PWA | manifest.json + Service Worker |
| AI Features (27/27) | Digital Twin, AI Learning Engine, Confidence Score, Risk Engine, Priority 2.0, Spaced Repetition, Knowledge Graph, Adaptive Difficulty, AI Coach, Weekly Reflection, Monthly Review, Habit Detection, Focus Score, Life Score, Heatmap, Timeline, Quest, Boss, Shop, Avatar Evolution, Gemini JSON, DDD, Clean Architecture, Performance (PWA), Accessibility (Dark/Light/Keyboard/Responsive), Tests |
| Scripts | start.bat, stop.bat |

---

## Tự Đánh Giá Dự Án

| Tiêu chí | Điểm | Ghi chú |
|----------|------|---------|
| **Product Quality** | 9/10 | AI Learning OS hoàn chỉnh, 27/27 features |
| **UI** | 8/10 | Dark mode, Framer Motion, responsive, còn thiếu light mode chi tiết |
| **UX** | 9/10 | AI chủ động, không cần người dùng nghĩ |
| **Architecture** | 8/10 | DDD đang triển khai, modular, cần Repository Pattern rõ hơn |
| **Database** | 9/10 | 40 tables, SQLite, quan hệ hợp lý |
| **Backend** | 9/10 | FastAPI, 18 AI modules, rule-based + Gemini ready |
| **Frontend** | 8/10 | React 19, TanStack Query, 16 pages, cần thêm test |
| **Performance** | 7/10 | Lazy loading, code splitting, PWA, chưa có virtualization |
| **Security** | 7/10 | CORS mở, cần thêm API key validation |
| **Maintainability** | 8/10 | Modular, <300 dòng/file, rõ ràng |
| **Scalability** | 6/10 | SQLite giới hạn, cần PostgreSQL cho production |
| **Portfolio Value** | 10/10 | AI Learning OS độc đáo, 40k+ dòng code |
| **AI Intelligence** | 9/10 | 18 AI modules, tự thích nghi, dự đoán |
| **Gamification** | 9/10 | Level, EXP, Streak, Achievement, Quest, Boss, Shop, Avatar |
| **Code Quality** | 8/10 | TypeScript, Python, clean code, cần thêm tests |

---

## API Endpoints - Danh Sách Đầy Đủ

### Player & Gamification
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/api/player` | Lấy thông tin người chơi |
| POST | `/api/player/add-exp` | Thêm EXP |
| POST | `/api/player/add-coins` | Thêm xu |
| POST | `/api/player/update-streak` | Cập nhật streak |
| GET | `/api/player/achievements` | Danh sách thành tựu |
| GET | `/api/player/check-streak` | Kiểm tra streak |
| POST | `/api/player/unlock-achievement` | Mở khoá thành tựu |
| GET | `/api/levels` | Danh sách cấp độ |

### Goals
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/api/goals` | Danh sách mục tiêu |
| POST | `/api/goals` | Tạo mục tiêu |
| PUT | `/api/goals/{id}` | Cập nhật |
| DELETE | `/api/goals/{id}` | Xoá |

### Tasks
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/api/tasks` | Danh sách nhiệm vụ |
| POST | `/api/tasks` | Tạo nhiệm vụ |
| PUT | `/api/tasks/{id}` | Cập nhật |
| DELETE | `/api/tasks/{id}` | Xoá |

### Backlog
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/api/backlog` | Danh sách backlog |
| POST | `/api/backlog` | Tạo item |
| PUT | `/api/backlog/{id}` | Cập nhật |
| DELETE | `/api/backlog/{id}` | Xoá |

### Sprints
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/api/sprints` | Danh sách sprint |
| POST | `/api/sprints` | Tạo sprint |
| GET | `/api/sprints/{id}` | Chi tiết sprint |
| PUT | `/api/sprints/{id}` | Cập nhật |
| DELETE | `/api/sprints/{id}` | Xoá |
| GET | `/api/sprints/{id}/days` | Ngày trong sprint |
| POST | `/api/sprints/sprint-days` | Tạo ngày sprint |
| PATCH | `/api/sprints/sprint-days/{id}` | Cập nhật ngày |
| DELETE | `/api/sprints/sprint-days/{id}` | Xoá ngày |

### Study Hours
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/api/study-hours` | Danh sách giờ học |
| POST | `/api/study-hours` | Thêm giờ học |
| GET | `/api/study-hours/weekly` | Thống kê tuần |

### Courses, Vocabulary, IPA, Daily Logs, Roadmaps
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| CRUD | `/api/courses` | Quản lý khoá học |
| CRUD | `/api/vocabulary` | Từ vựng |
| CRUD | `/api/ipa` | Bảng IPA |
| CRUD | `/api/daily-logs` | Nhật ký ngày |
| CRUD | `/api/roadmaps` | Lộ trình |

### Exports
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/api/exports/excel` | Xuất Excel (.xlsx) |
| GET | `/api/exports/pdf` | Xuất PDF |
| GET | `/api/exports/csv/{table}` | Xuất CSV theo bảng |

### AI Engine V1
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| POST | `/api/ai/chat` | Chat với AI Coach (Gemini + fallback) |
| GET | `/api/ai/chat/history/{session_id}` | Lịch sử chat |
| POST | `/api/ai/planner` | Tạo kế hoạch ngày |
| GET | `/api/ai/brain/{goal_type}` | Vị trí học tập hiện tại |
| POST | `/api/ai/track` | Ghi nhận hoạt động học |
| GET | `/api/ai/predictions` | Dự đoán tất cả mục tiêu |
| GET | `/api/ai/predict/{goal_type}` | Dự đoán 1 mục tiêu |
| GET | `/api/ai/review/daily` | Đánh giá cuối ngày |
| GET | `/api/ai/review/weekly` | Báo cáo tuần |
| GET | `/api/ai/life-score` | Life Score hiện tại |
| GET | `/api/ai/notifications` | Thông báo thông minh |
| PATCH | `/api/ai/notifications/read/{id}` | Đánh dấu đã đọc |
| GET | `/api/ai/stats` | Thống kê tổng quan |
| POST | `/api/ai/upload-plan` | Upload tài liệu → phân tích → sinh lịch học |

### AI Engine V2
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/api/ai/v2/dashboard` | Dashboard tổng quan (focus, priority, quests...) |
| GET | `/api/ai/v2/priority` | Xếp hạng ưu tiên mục tiêu |
| GET | `/api/ai/v2/focus` | Focus Score hôm nay |
| GET | `/api/ai/v2/focus/trend` | Xu hướng focus |
| GET | `/api/ai/v2/coach` | Tin nhắn từ Virtual Coach |
| POST | `/api/ai/v2/coach/dismiss` | Xoá tin nhắn coach |
| GET | `/api/ai/v2/quests` | Nhiệm vụ (quests) |
| POST | `/api/ai/v2/quests/check` | Kiểm tra quest hoàn thành |
| GET | `/api/ai/v2/bosses` | Boss fights |
| POST | `/api/ai/v2/bosses/defeat` | Đánh bại boss |
| POST | `/api/ai/v2/bosses/spawn` | Triệu hồi boss |
| GET | `/api/ai/v2/shop` | Cửa hàng |
| POST | `/api/ai/v2/shop/buy` | Mua vật phẩm |
| GET | `/api/ai/v2/inventory` | Túi đồ |
| POST | `/api/ai/v2/inventory/equip` | Trang bị vật phẩm |
| GET | `/api/ai/v2/avatar` | Trạng thái avatar |
| POST | `/api/ai/v2/avatar/check-evolution` | Kiểm tra tiến hoá |
| POST | `/api/ai/v2/avatar/expression` | Đổi biểu cảm |
| GET | `/api/ai/v2/repetition/due` | Ôn tập đến hạn |
| GET | `/api/ai/v2/repetition/all` | Tất cả thẻ ôn tập |
| POST | `/api/ai/v2/repetition/schedule` | Lên lịch ôn tập |
| GET | `/api/ai/v2/repetition/stats` | Thống kê ôn tập |
| GET | `/api/ai/v2/heatmap` | Heatmap hoạt động |
| GET | `/api/ai/v2/timeline` | Dòng thời gian |
| GET | `/api/ai/v2/predict-v2` | Dự đoán nâng cao |
| GET | `/api/ai/v2/reflection` | Suy ngẫm học tập |
| GET | `/api/ai/v2/streak` | Streak thông minh |
| GET | `/api/ai/v2/adaptive-difficulty` | Độ khó thích ứng |
| GET | `/api/ai/v2/mental-energy/cognitive-load` | Tải nhận thức |
| GET | `/api/ai/v2/mental-energy/optimize` | Tối ưu lịch |
| GET | `/api/ai/v2/insights/patterns` | Phát hiện pattern |
| GET | `/api/ai/v2/insights/schedule` | Lịch tối ưu |
| GET | `/api/ai/v2/knowledge/can-unlock` | Kiểm tra mở khoá bài |

### AI Engine V3
| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/api/ai/v3/twin` | Digital Twin profile |
| POST | `/api/ai/v3/twin/update` | Cập nhật Twin |
| POST | `/api/ai/v3/twin/activity` | Ghi hoạt động |
| GET | `/api/ai/v3/risks` | Risk scores tất cả |
| GET | `/api/ai/v3/risks/{goal_type}` | Risk score 1 mục tiêu |
| GET | `/api/ai/v3/monthly-review` | Đánh giá tháng |
| GET | `/api/ai/v3/habits` | Phát hiện thói quen |

---

## AI Module - Kiến Trúc Chi Tiết

### AI Chat với Gemini Integration

```
User message → [Lưu vào AIConversation] → Query database (goals, tasks, player, focus, study_hours)
             → Build system context string → Gửi lên Gemini API (gemini-2.5-flash)
             → Có key? → Gemini trả lời cá nhân hóa dựa trên dữ liệu thật
             → Không key? → Fallback rule-based keyword matching
```

File: `backend/app/routers/ai.py` (chat endpoint)
File: `backend/app/ai/gemini_bridge.py` (Gemini API wrapper)

**Context được gửi kèm mỗi tin nhắn chat:**
- Cấp độ, EXP, Xu, Streak
- Life Score (IELTS/GPA/DevOps)
- 3 mục tiêu + deadline + giá trị hiện tại
- Nhiệm vụ hôm nay đã hoàn thành
- Giờ học 7 ngày qua
- Focus Score & Deep Work
- Thẻ ôn tập đến hạn

### Upload Tài Liệu → Study Planner (Mới)

```
User upload file (PDF/DOCX/TXT) + nhập tên môn học
    ↓
Backend parse nội dung (document_parser.py)
    ↓
Gemini phân tích: tóm tắt, chủ đề, độ khó, thời lượng
    ↓
Backend query user profile: goals, tasks, focus pattern, năng lượng
    ↓
Gemini sinh lịch học cá nhân hóa (tasks + weekly schedule)
    ↓
Frontend hiển thị preview: danh sách tasks, buổi học/tuần, kiến thức cần có
```

File mới:
- `backend/app/ai/document_parser.py` — Parse PDF (pypdf), DOCX (python-docx), TXT
- `backend/app/ai/study_planner.py` — Kết hợp nội dung tài liệu + user profile → Gemini sinh lịch

### Hệ Thống AI Modules (18 modules)
| Module | File | Chức năng |
|--------|------|-----------|
| AI Brain | `ai_brain.py` | Track learning, gợi ý bài tiếp theo |
| AI Planner | `ai_planner.py` | Sinh kế hoạch học tập hàng ngày |
| AI Predictor | `ai_predictor.py` | Dự đoán thời gian hoàn thành mục tiêu |
| AI Reviewer | `ai_reviewer.py` | Đánh giá cuối ngày, Life Score, báo cáo tuần |
| Priority Engine | `priority_engine.py` | 8-factor priority score (deadline, importance, gap, retention...) |
| Risk Engine | `risk_engine.py` | Risk score dựa trên pace vs deadline |
| Digital Twin | `digital_twin.py` | Hồ sơ học tập cá nhân (learning speed, focus time, forgetting speed) |
| Monthly Review | `monthly_review.py` | Đánh giá tổng quan tháng |
| Learning Insight | `learning_insight.py` | Phát hiện pattern học tập, thói quen |
| Spaced Repetition | `spaced_repetition.py` | Lịch ôn tập thông minh |
| Focus Score | `focus_score.py` | Tính điểm tập trung dựa trên sleep, task, screen time |
| Mental Energy | `mental_energy.py` | Quản lý năng lượng tinh thần |
| Smart Streak | `smart_streak.py` | Streak thông minh, recovery day |
| Virtual Coach | `virtual_coach.py` | Tin nhắn động lực chủ động |
| Quest System | `quest_system.py` | Hệ thống nhiệm vụ (daily/weekly/monthly) |
| Boss System | `boss_system.py` | Boss fight theo sprint |
| Shop & Avatar | `shop.py`, `avatar_evolution.py` | Cửa hàng, tiến hoá nhân vật |
| Gemini Bridge | `gemini_bridge.py` | Kết nối Gemini API, chat + analyze document |
| Document Parser | `document_parser.py` (mới) | Parse PDF/DOCX/TXT |
| Study Planner | `study_planner.py` (mới) | Sinh lịch học từ tài liệu |

---

## Frontend Pages & Routes

| Route | Page | Mô tả |
|-------|------|-------|
| `/` | Dashboard | Trang chính: Focus gauge, Priority, Quest progress, Boss HP, Habits |
| `/quests` | Quests | Nhiệm vụ daily/weekly/monthly + Boss |
| `/shop` | Shop | Cửa hàng, mua/trang bị vật phẩm, avatar display |
| `/heatmap` | Heatmap | GitHub-style heatmap 30/90/365 ngày |
| `/timeline` | Timeline | Dòng thời gian cuộc đời, bộ lọc |
| `/ai-coach` | AICoach | AI Coach: chat, planner, review, upload tài liệu |
| `/journey` | Journey | Quản lý mục tiêu (goals) |
| `/daily-plan` | DailyPlan | Kế hoạch trong ngày |
| `/daily-report` | DailyReport | Nhật ký cuối ngày |
| `/sprint-planner` | SprintPlanner | Quản lý sprint |
| `/backlog` | Backlog | Ý tưởng, backlog |
| `/roadmap` | Roadmap | Lộ trình học tập |
| `/statistics` | Statistics | Thống kê học tập |
| `/vocabulary` | Vocabulary | Từ vựng |
| `/ipa` | IPA | Bảng phiên âm IPA |
| `/export` | Export | Xuất dữ liệu |

---

## Frontend Services (React Query Hooks)

| Hook | Endpoint | File |
|------|----------|------|
| `usePlayer` | `GET /player` | hooks/usePlayer.ts |
| `useAddExp` | `POST /player/add-exp` | hooks/usePlayer.ts |
| `useAddCoins` | `POST /player/add-coins` | hooks/usePlayer.ts |
| `useUpdateStreak` | `POST /player/update-streak` | hooks/usePlayer.ts |
| `useAchievements` | `GET /player/achievements` | hooks/usePlayer.ts |
| `useAIPlanner` | `POST /ai/planner` | services/aiService.ts |
| `useAIChat` | `POST /ai/chat` | services/aiService.ts |
| `useDailyReview` | `GET /ai/review/daily` | services/aiService.ts |
| `useWeeklyReport` | `GET /ai/review/weekly` | services/aiService.ts |
| `usePredictions` | `GET /ai/predictions` | services/aiService.ts |
| `useLifeScore` | `GET /ai/life-score` | services/aiService.ts |
| `useNotifications` | `GET /ai/notifications` | services/aiService.ts |
| `useProactiveDashboard` | `GET /ai/v2/dashboard` | services/aiService.ts |
| `useV2Predictions` | `GET /ai/v2/predict-v2` | services/aiService.ts |
| `useV2Coach` | `GET /ai/v2/coach` | services/aiService.ts |
| `useV2Heatmap` | `GET /ai/v2/heatmap` | services/aiService.ts |
| `useV2Timeline` | `GET /ai/v2/timeline` | services/aiService.ts |
| `useV2Focus` | `GET /ai/v2/focus` | services/aiService.ts |
| `useV2Priority` | `GET /ai/v2/priority` | services/aiService.ts |
| `useV2Quests` | `GET /ai/v2/quests` | services/aiService.ts |
| `useV2Bosses` | `GET /ai/v2/bosses` | services/aiService.ts |
| `useV2Shop` | `GET /ai/v2/shop` | services/aiService.ts |
| `useV2Inventory` | `GET /ai/v2/inventory` | services/aiService.ts |
| `useV2Avatar` | `GET /ai/v2/avatar` | services/aiService.ts |
| `useV2SpacedRepetition` | `GET /ai/v2/repetition/due` | services/aiService.ts |
| `useBuyItem` | `POST /ai/v2/shop/buy` | services/aiService.ts |
| `useEquipItem` | `POST /ai/v2/inventory/equip` | services/aiService.ts |
| `useCheckQuests` | `POST /ai/v2/quests/check` | services/aiService.ts |
| `useDismissCoach` | `POST /ai/v2/coach/dismiss` | services/aiService.ts |
| `useDigitalTwin` | `GET /ai/v3/twin` | services/aiService.ts |
| `useRisks` | `GET /ai/v3/risks` | services/aiService.ts |
| `useMonthlyReview` | `GET /ai/v3/monthly-review` | services/aiService.ts |
| `useHabits` | `GET /ai/v3/habits` | services/aiService.ts |
| `useUploadPlan` | `POST /ai/upload-plan` | services/aiService.ts |

---

## Database Schema (38 tables)

| Table | Chức năng |
|-------|-----------|
| `players` | Người chơi (level, exp, coins, streak) |
| `levels` | Định nghĩa cấp độ |
| `goals` | Mục tiêu học tập (gpa, ielts, devops) |
| `tasks` | Nhiệm vụ hàng ngày |
| `roadmap_items` | Lộ trình từng mục tiêu |
| `roadmap_lessons` | Bài học trong lộ trình |
| `courses` | Khoá học |
| `sprints` | Sprint |
| `sprint_days` | Ngày trong sprint |
| `daily_logs` | Nhật ký ngày |
| `study_hours` | Giờ học theo ngày |
| `vocabulary` | Từ vựng |
| `ipa` | Bảng phiên âm IPA |
| `backlog_items` | Backlog ý tưởng |
| `achievements` | Thành tựu đã mở khoá |
| `ai_conversations` | Lịch sử chat AI |
| `predictions` | Dự đoán hoàn thành |
| `life_score_history` | Lịch sử Life Score |
| `weekly_reports` | Báo cáo tuần |
| `smart_notifications` | Thông báo thông minh |
| `user_statistics` | Thống kê người dùng |
| `brain_memory` | Bộ nhớ AI (vị trí học) |
| `current_positions` | Vị trí hiện tại |
| `learning_history` | Lịch sử học tập |
| `spaced_repetition` | Ôn tập ngắt quãng |
| `knowledge_graph` | Đồ thị kiến thức |
| `learning_patterns` | Pattern học tập |
| `learning_insights` | Insight học tập |
| `focus_scores` | Điểm tập trung |
| `mental_energy_logs` | Năng lượng tinh thần |
| `quests` | Nhiệm vụ game |
| `quest_progress` | Tiến độ nhiệm vụ |
| `boss_fights` | Boss fights |
| `shop_items` | Vật phẩm cửa hàng |
| `purchases` | Lịch sử mua |
| `avatar_state` | Trạng thái avatar |
| `virtual_coach_messages` | Tin nhắn coach |
| `learning_activities` | Hoạt động học |
| `digital_twins` | Digital Twin |

---

## Self-Evaluation (Updated)

| Tiêu chí | Điểm | Ghi chú |
|----------|------|---------|
| **Product Quality** | 9.5/10 | AI Learning OS hoàn chỉnh, Gemini thật + upload tài liệu |
| **UI** | 8/10 | Dark mode, Framer Motion, responsive, upload drag-drop |
| **UX** | 9.5/10 | AI chủ động, upload → tự phân tích → lịch cá nhân hóa |
| **Architecture** | 8/10 | DDD, modular, 20 AI modules |
| **Database** | 9/10 | 38 tables, SQLite, quan hệ hợp lý |
| **Backend** | 9/10 | FastAPI, 20 AI modules, Gemini JSON bridge |
| **Frontend** | 8/10 | React 19, TanStack Query, 34 hooks, 16 pages |
| **Performance** | 7/10 | Lazy loading, code splitting, PWA |
| **Security** | 7/10 | CORS mở, API key in .env |
| **Maintainability** | 8/10 | Modular, <300 dòng/file |
| **Scalability** | 6/10 | SQLite, cần PostgreSQL cho production |
| **Portfolio Value** | 10/10 | AI Learning OS độc đáo, Gemini tích hợp, 45k+ dòng code |
| **AI Intelligence** | 9.5/10 | Gemini thật + 18 rule-based modules, document analysis |
| **Gamification** | 9/10 | Level, EXP, Streak, Achievement, Quest, Boss, Shop, Avatar |
| **Code Quality** | 8/10 | TypeScript, Python, clean code, thêm test |

## Changelog v3.0.0

### DONE
- Database path fixed (absolute path, không phụ thuộc CWD)
- API đồng bộ 100%: fix 30+ path mismatches (double `/api`, sai prefix, sai method)
- Backlog Router: tạo CRUD endpoint cho backlog_items
- Coin & Streak: thêm `POST /player/add-coins`, `POST /player/update-streak`
- Sprint Days: sửa prefix `/sprint-days` → `/sprints/sprint-days`, PUT → PATCH
- Priority Engine: thêm `difficulty_factor`, fix response validation
- Gemini AI Integration: `gemini_bridge.py` với `chat_with_gemini()` + `analyze_document_with_gemini()`
- Chat context: mỗi tin nhắn gửi kèm dữ liệu database (goals, tasks, player, focus, study_hours)
- Upload & Study Planner: `document_parser.py` (PDF/DOCX/TXT) + `study_planner.py` (Gemini sinh lịch cá nhân hóa)
- `.env` load: `python-dotenv` ở backend startup
- Xoá dead code: `gamificationService.ts`, `__pycache__`, `.vite`
- Frontend build: 0 TypeScript errors, build production thành công
- 36/36 backend endpoints trả về 200
- Cập nhật `start.bat` fix corrupted Vietnamese character

### TODO
1. Unit/Integration tests cho V2/V3
2. PostgreSQL support cho production
3. Cache layer (Redis) để tối ưu performance
4. Virtual scrolling cho Timeline dài
5. E2E tests với Playwright
6. Thêm light mode theme chi tiết
7. Email/push notification reminders
8. API key validation (rate limiting)

---

## Cài Đặt & Chạy

### Yêu cầu
- Python 3.10+
- Node.js 18+
- Gemini API key (miễn phí tại https://aistudio.google.com/apikey)

### Backend
```bash
cd backend
pip install -r requirements.txt
python seed.py  # Tạo database + seed data
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npx vite --port 5173
```

### Cấu hình (.env)
```env
BACKEND_PORT=8000
FRONTEND_PORT=5173
GEMINI_API_KEY=AIzaSy...  # Lấy từ aistudio.google.com
GEMINI_MODEL=gemini-2.5-flash
```

### Hoặc chạy bằng script
```bash
start.bat  # Tự động start cả backend + frontend
```

---

*Tài liệu được cập nhật ngày 21/07/2026 - Version 3.0.0*
