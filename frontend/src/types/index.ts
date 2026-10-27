export type TaskStatus = 'chưa làm' | 'đang làm' | 'hoàn thành'
export type GoalType = 'gpa' | 'ielts' | 'devops'
export type Priority = 'cao' | 'trung bình' | 'thấp'

export interface Goal {
  id: number
  name: string
  type: GoalType
  target_value: number
  current_value: number
  deadline: string | null
  priority: Priority
  progress_percent: number
  created_at: string
  updated_at: string
}

export interface RoadmapItem {
  id: number
  goal_type: GoalType
  title: string
  description: string | null
  order_index: number
  deadline: string | null
  is_completed: boolean
  created_at: string
}

export interface Course {
  id: number
  name: string
  description: string | null
  goal_type: GoalType
  total_hours: number
  completed_hours: number
  created_at: string
}

export interface Task {
  id: number
  title: string
  description: string | null
  goal_type: GoalType
  course_id: number | null
  date: string | null
  start_time: string | null
  end_time: string | null
  status: TaskStatus
  priority: Priority
  created_at: string
}

export interface Sprint {
  id: number
  name: string
  start_date: string
  end_date: string
  goal_type: GoalType
  created_at: string
}

export interface SprintDay {
  id: number
  sprint_id: number
  date: string
  activity: string | null
  is_compulsory: boolean
  time_range: string | null
  note: string | null
  created_at: string
}

export interface DailyLog {
  id: number
  date: string
  completion_percent: number
  sleep_hours: number | null
  energy_level: number | null
  mood_level: number | null
  note: string | null
  activities: string | null
  created_at: string
}

export interface StudyHour {
  id: number
  date: string
  goal_type: GoalType
  hours: number
  created_at: string
}

export interface Player {
  id: number
  level: number
  exp: number
  exp_to_next: number
  coins: number
  streak: number
  created_at: string
  updated_at: string
}

export interface Achievement {
  id: number
  code: string
  name: string
  description: string
  icon: string
  unlocked_at: string | null
}

export interface Level {
  level: number
  exp_required: number
  title: string
}

export interface Vocabulary {
  id: number
  word: string
  meaning: string
  example: string | null
  category: string | null
  type?: string
  created_at: string
}

export interface VocabularyImportResult {
  total: number
  imported: number
  errors: string[]
}

export interface IPASymbol {
  id: number
  symbol: string
  description: string | null
  example_word: string | null
  audio_url: string | null
  created_at: string
}

export interface BacklogItem {
  id: number
  title: string
  description: string | null
  category: string | null
  priority: Priority
  status: 'trong kho' | 'đang thực hiện' | 'đã hoàn thành'
  created_at: string
}

export interface AIPrediction {
  goal_type: GoalType
  predicted_completion: string
  current_pace: number
  improved_pace: number
  improved_date: string
  confidence: number
}

export interface AIReview {
  date: string
  rating: number
  summary: string
  suggestions: string[]
  life_score_delta: number
}

export interface AIPlanTask {
  title: string
  goal_type: GoalType
  start_time: string
  end_time: string
}

export interface AIPlan {
  date: string
  summary: string
  tasks: AIPlanTask[]
}

// === AI Types ===
export interface BrainMemory {
  id: number; goal_type: GoalType; module: string; lesson: string; checkpoint: string;
  position_json: string; progress_percent: number; mastery_level: number;
  last_studied: string; created_at: string; updated_at: string;
}

export interface LearningHistory {
  id: number; goal_type: GoalType; activity_type: string; title: string;
  module: string; lesson: string; duration_minutes: number; score: number | null;
  created_at: string;
}

export interface CurrentPosition {
  id: number; goal_type: GoalType; current_module: string; current_lesson: string;
  current_chapter: string; current_test: string; current_section: string;
  progress_percent: number; difficulty_level: number; mastery_score: number;
  created_at: string; updated_at: string;
}

export interface RoadmapLesson {
  id: number; goal_type: GoalType; module_name: string; lesson_name: string;
  order_index: number; description: string; difficulty: number; energy_cost: number;
  exp_reward: number; estimated_minutes: number; prerequisites: string;
  is_completed: boolean; created_at: string;
}

export interface Prediction {
  goal_type: GoalType; current_pace: number; predicted_date: string;
  improved_pace: number; improved_date: string; streak_break_impact: string;
  confidence: string;
}

export interface AIPlannerResponse {
  summary: string; reason: string; priority: GoalType[];
  blocks: AIPlannerBlock[]; energy: number; predicted_completion: string;
}

export interface AIPlannerBlock {
  start_time: string; end_time: string; goal_type: GoalType;
  title: string; description: string; difficulty: number;
  energy_cost: number; exp_reward: number;
}

export interface DailyReview {
  rating: number; completion_percent: number;
  strengths: string[]; weaknesses: string[]; suggestions: string[];
}

export interface WeeklyReport {
  week_start: string; week_end: string; total_hours: number;
  top_subject: string; neglected_subjects: string[];
  progress_summary: string; strengths: string[]; weaknesses: string[];
  plan_next_week: string; life_score: number; created_at: string;
}

export interface ChatMessage {
  id: number; role: 'user' | 'assistant'; message: string;
  context_json: string; created_at: string;
}

export interface LifeScore {
  score: number; ielts: number; gpa: number; devops: number;
  streak: number; achievement: number; level: number;
  [key: string]: number | undefined;
}

export interface SmartNotification {
  id: number; title: string; message: string; notification_type: string;
  is_read: boolean; scheduled_at: string; created_at: string;
}

export interface UserStatisticsSummary {
  total_hours: number; tasks_completed: number; exp_earned: number;
  life_score: number; streak: number; daily_stats: any[];
}

// === V2 Types ===
export interface ProactiveDashboard {
  coach_message: VirtualCoachMessage | null
  focus_score: number
  life_score: number
  priority_focus: string[]
  review_due_count: number
  quest_reminder: string | null
  blocks: any[]
  sleep_warning: string | null
  energy_advice: string | null
}

export interface VirtualCoachMessage {
  id: number
  message_type: string
  title: string
  content: string
  action_label: string | null
  action_url: string | null
  priority_score: number
  created_at: string
}

export interface PriorityScore {
  goal_type: GoalType
  score: number
  deadline_weight: number
  learning_gap: number
  energy_factor: number
  retention_factor: number
  risk_factor: number
  risk_level: string
  importance: number
  remaining_days_factor: number
  consistency_factor: number
}

export interface HeatmapEntry {
  date: string
  count: number
  intensity: number
  goal_type: string
}

export interface LifeTimelineEntry {
  date: string
  title: string
  goal_type: string
  status: string
  duration_minutes: number
}

export interface Quest {
  id: number
  title: string
  description: string
  quest_type: string
  goal_type: string
  exp_reward: number
  coin_reward: number
  progress: number
  target: number
  is_completed: boolean
}

export interface BossFight {
  id: number
  name: string
  goal_type: string
  boss_type: string
  difficulty: number
  exp_reward: number
  coin_reward: number
  is_defeated: boolean
  score: number | null
  hp: number
  max_hp: number
}

export interface ShopItem {
  id: number
  name: string
  item_type: string
  price: number
  rarity: string
  icon: string
  is_limited: boolean
  purchased: boolean
  equipped: boolean
}

export interface AvatarInfo {
  evolution_stage: number
  evolution_label: string
  exp_to_next: number
  current_expression: string
  accessory: string | null
  aura: string | null
  theme: string
}

export interface FocusScoreResponse {
  date: string
  score: number
  sleep_hours: number
  total_study_minutes: number
  task_switches: number
  deep_work_minutes: number
}

export interface SpacedRepetitionItem {
  id: number
  concept_key: string
  concept_label: string
  review_count: number
  retention_score: number
  mastery: number
  interval_days: number
  next_review_date: string | null
}

// === V3 Types ===
export interface DigitalTwinProfile {
  learning_speed: number
  focus_time_minutes: number
  effective_hours: number[]
  favorite_subjects: string[]
  skipped_subjects: string[]
  forgetting_speed: number
  absorption_rate: number
  avg_task_completion_minutes: number
  avg_break_minutes: number
  avg_daily_energy: number
  consistency_score: number
  total_sessions: number
}

export interface RiskScore {
  goal_type: GoalType
  risk: string
  score: number
  message: string
  deadline_days: number
  current_pace: number
  needed_pace: number
  trend: string
}

export interface MonthlyReview {
  month: number
  year: number
  summary: string
  total_days: number
  active_days: number
  completion_rate: number
  total_study_hours: number
  total_tasks: number
  completed_tasks: number
  task_completion_rate: number
  avg_mood: number
  avg_energy: number
  avg_sleep: number
  hours_by_goal: Record<string, number>
  goal_progress: { name: string; type: string; progress: number; pace: number }[]
  risks: RiskScore[]
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

export interface HabitDetection {
  habits: { habit: string; confidence: number }[]
}

export interface StudyPlanTask {
  title: string
  description: string
  goal_type: GoalType
  estimated_minutes: number
  difficulty: number
  order: number
}

export interface WeeklySchedule {
  sessions_per_week: number
  minutes_per_session: number
  recommended_days: string[]
}

export interface StudyPlanResult {
  summary: string
  subject: string
  difficulty: string
  total_hours_estimate: number
  tasks: StudyPlanTask[]
  weekly_schedule: WeeklySchedule
  prerequisites: string[]
  tools_needed: string[]
}

// ===== V3 Knowledge System =====
export interface KnowledgePack {
  id: number
  title: string
  description?: string
  source_type: string
  source_filename: string
  total_pages: number
  total_lessons: number
  status: 'pending' | 'processing' | 'ready' | 'error'
  error_message?: string
  created_at: string
}

export interface Chapter {
  id: number
  pack_id: number
  title: string
  description?: string
  order: number
  start_page?: number
  end_page?: number
  created_at: string
}

export interface LessonProgress {
  lesson_id: number
  status: 'not_started' | 'studying' | 'completed' | 'reviewing'
  progress_percent: number
  total_study_minutes: number
  flashcards_reviewed: number
  quiz_score?: number
  mastery_level: number
  next_review_date?: string
}

export interface Lesson {
  id: number
  chapter_id: number
  pack_id: number
  title: string
  description?: string
  order: number
  duration_minutes: number
  difficulty: number
  start_page?: number
  end_page?: number
  keywords?: string[]
  xp_reward: number
  status: string
  created_at: string
  progress?: LessonProgress
}

export interface Flashcard {
  id: number
  lesson_id: number
  question: string
  answer: string
  hint?: string
  difficulty: number
}

export interface Quiz {
  id: number
  lesson_id: number
  title: string
  description?: string
  time_limit_minutes: number
  passing_score: number
  question_count: number
  attempted: boolean
  best_score?: number
}

export interface QuizQuestion {
  id: number
  question: string
  options: string[]
  order: number
}

export interface QuizResult {
  quiz_id: number
  score: number
  total_questions: number
  correct_count: number
  passed: boolean
  answers: { question_id: number; user_answer: number; correct_answer: number; is_correct: boolean; explanation?: string }[]
  time_spent_seconds?: number
}

export interface StudySession {
  id: number
  lesson_id: number
  pack_id: number
  duration_minutes: number
  pages_read: number
  status: string
  started_at: string
  completed_at?: string
}

export interface DailyMission {
  id: number
  date: string
  title: string
  description?: string
  items?: DailyMissionItem[]
  total_xp: number
  earned_xp: number
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  completed_at?: string
}

export interface DailyMissionItem {
  type: 'study' | 'review' | 'quiz' | 'explore'
  lesson_id?: number
  quiz_id?: number
  title: string
  pack_title?: string
  duration_minutes: number
  xp: number
}

export interface PackProgress {
  pack_id: number
  total_lessons: number
  completed_lessons: number
  progress_percent: number
  total_study_minutes: number
  mastery_average: number
}

export interface UploadResult {
  id: number
  title: string
  filename: string
  status: string
  message: string
}

export interface DailyCoachMessage {
  message: string
  today_mission: string
  stats: {
    total_packs: number
    total_lessons: number
    completed_lessons: number
    studying_lessons: number
    completion_rate: number
    total_study_minutes: number
    today_xp: number
    today_minutes: number
    review_stats: { total_flashcards: number; due_now: number; mastered: number }
  }
}
