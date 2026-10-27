import type { GoalType, Priority, TaskStatus } from '@/types'

export const GOAL_TYPES: { value: GoalType; label: string; color: string }[] = [
  { value: 'gpa', label: 'GPA', color: '#3B82F6' },
  { value: 'ielts', label: 'IELTS', color: '#8B5CF6' },
  { value: 'devops', label: 'DevOps', color: '#10B981' },
]

export const PRIORITY_MAP: Record<Priority, { label: string; color: string }> = {
  'cao': { label: 'Cao', color: '#EF4444' },
  'trung bình': { label: 'Trung bình', color: '#F59E0B' },
  'thấp': { label: 'Thấp', color: '#6B7280' },
}

export const STATUS_MAP: Record<TaskStatus, { label: string; color: string }> = {
  'chưa làm': { label: 'Chưa làm', color: '#6B7280' },
  'đang làm': { label: 'Đang làm', color: '#3B82F6' },
  'hoàn thành': { label: 'Hoàn thành', color: '#10B981' },
}

export const LEVEL_THRESHOLDS = [
  { level: 1, exp_required: 0, title: 'Tân Thủ' },
  { level: 2, exp_required: 200, title: 'Học Đồ' },
  { level: 3, exp_required: 500, title: 'Người Học' },
  { level: 4, exp_required: 1000, title: 'Học Viên' },
  { level: 5, exp_required: 1800, title: 'Đệ Tử' },
  { level: 6, exp_required: 2800, title: 'Môn Đồ' },
  { level: 7, exp_required: 4000, title: 'Cao Đồ' },
  { level: 8, exp_required: 5500, title: 'Tinh Anh' },
  { level: 9, exp_required: 7500, title: 'Cao Thủ' },
  { level: 10, exp_required: 10000, title: 'Bậc Thầy' },
]

export const EXP_REWARDS = {
  TASK_COMPLETE: 20,
  TASK_HIGH_PRIORITY: 35,
  DAILY_LOG: 100,
  STREAK_3: 150,
  STREAK_7: 300,
  STREAK_30: 1500,
  SPRINT_COMPLETE: 1000,
  GOAL_COMPLETE: 2000,
  BACKLOG_CLEAR: 50,
}

export const ACHIEVEMENT_DEFINITIONS = [
  { code: 'first_task', name: 'Bước Đầu Tiên', description: 'Hoàn thành nhiệm vụ đầu tiên', icon: '🎯' },
  { code: 'streak_7', name: 'Tuần Luyện Tập', description: 'Duy trì chuỗi 7 ngày', icon: '🔥' },
  { code: 'streak_30', name: 'Tháng Kiên Trì', description: 'Duy trì chuỗi 30 ngày', icon: '💪' },
  { code: 'sprint_master', name: 'Chiến Binh Sprint', description: 'Hoàn thành 1 sprint', icon: '⚔️' },
  { code: 'gold_rush', name: 'Cơn Sốt Vàng', description: 'Tích lũy 1000 coins', icon: '🪙' },
  { code: 'polyglot', name: 'Đa Ngôn Ngữ', description: 'Học 100 từ vựng', icon: '📚' },
  { code: 'level_5', name: 'Đệ Tử Chân Truyền', description: 'Đạt cấp độ 5', icon: '⭐' },
  { code: 'level_10', name: 'Bậc Thầy', description: 'Đạt cấp độ 10', icon: '👑' },
  { code: 'roadmap_done', name: 'Vạch Đến Đích', description: 'Hoàn thành lộ trình', icon: '🗺️' },
  { code: 'night_owl', name: 'Cú Đêm', description: 'Học sau 10h tối 7 lần', icon: '🦉' },
]

export const DAY_NAMES = [
  'Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy',
]

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
  { label: 'Kế hoạch & Nhật ký', path: '/today', icon: 'ListTodo' },
  { label: 'Thống kê', path: '/statistics', icon: 'BarChart3' },
  { label: 'AI Coach', path: '/ai-coach', icon: 'Brain' },
  { label: 'Ngôn ngữ', path: '/language', icon: 'BookOpen' },
]

export const DIFFICULTY_MAP = {
  1: { label: 'Rất dễ', color: '#22C55E' },
  2: { label: 'Dễ', color: '#3B82F6' },
  3: { label: 'Trung bình', color: '#EAB308' },
  4: { label: 'Khó', color: '#F97316' },
  5: { label: 'Rất khó', color: '#EF4444' },
}

export const ENERGY_COST = { ipa: 10, vocabulary: 15, listening: 30, reading: 60, writing: 70, linux: 40, docker: 60, aws: 90, kubernetes: 120 } as const

export const AI_PLACEHOLDER_IMAGE = '🤖'

export const KEYBOARD_SHORTCUTS = [
  { key: 'ctrl+k', description: 'Mở Command Palette', category: 'Chung' },
  { key: 'ctrl+d', description: 'Mở Dashboard', category: 'Điều hướng' },
  { key: 'ctrl+t', description: 'Kế hoạch & Nhật ký', category: 'Điều hướng' },
  { key: 'ctrl+shift+p', description: 'AI Planner', category: 'AI' },
  { key: 'ctrl+shift+c', description: 'AI Coach Chat', category: 'AI' },
  { key: 'h', description: 'Phím tắt', category: 'Trợ giúp' },
]
