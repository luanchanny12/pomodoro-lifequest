export interface SchoolScheduleItem {
  id: number
  school_name?: string
  course_code?: string
  course_name: string
  day_of_week: number
  day_name: string
  start_time: string
  end_time: string
  room?: string
  lecturer?: string
  semester?: string
  is_active: boolean
}

export const OFFICIAL_PHENIKAA_K17_SCHEDULE: SchoolScheduleItem[] = [
  {
    id: 101,
    school_name: 'Đại học Phenikaa',
    course_code: 'CSE702031',
    course_name: 'Lập trình phân tích dữ liệu với python (Lý thuyết)',
    day_of_week: 2,
    day_name: 'Thứ 2',
    start_time: '15:35',
    end_time: '18:15',
    room: 'A4-203',
    lecturer: 'Thầy Bùi Anh Tuấn',
    semester: 'Học kỳ 2 (2026-2027)',
    is_active: true,
  },
  {
    id: 102,
    school_name: 'Đại học Phenikaa',
    course_code: 'CSE702031-TH',
    course_name: 'Lập trình phân tích dữ liệu với python (Thực hành)',
    day_of_week: 4,
    day_name: 'Thứ 4',
    start_time: '09:50',
    end_time: '12:30',
    room: 'A6-201.202 (PC)',
    lecturer: 'Thầy Bùi Anh Tuấn',
    semester: 'Học kỳ 2 (2026-2027)',
    is_active: true,
  },
  {
    id: 103,
    school_name: 'Đại học Phenikaa',
    course_code: 'CSE702060',
    course_name: 'Trực quan hoá dữ liệu (Lý thuyết)',
    day_of_week: 4,
    day_name: 'Thứ 4',
    start_time: '15:35',
    end_time: '18:15',
    room: 'A8-201',
    lecturer: 'Thầy Đào Thiện Thành',
    semester: 'Học kỳ 2 (2026-2027)',
    is_active: true,
  },
  {
    id: 104,
    school_name: 'Đại học Phenikaa',
    course_code: 'CSE702049',
    course_name: 'Quản trị dự án CNTT (Lý thuyết)',
    day_of_week: 5,
    day_name: 'Thứ 5',
    start_time: '07:00',
    end_time: '09:40',
    room: 'A4-502 (TH)',
    lecturer: 'Thầy Nguyễn Văn Hùng',
    semester: 'Học kỳ 2 (2026-2027)',
    is_active: true,
  },
  {
    id: 105,
    school_name: 'Đại học Phenikaa',
    course_code: 'CSE702049-EL',
    course_name: 'Quản trị dự án CNTT (E-learning)',
    day_of_week: 5,
    day_name: 'Thứ 5',
    start_time: '18:00',
    end_time: '20:30',
    room: 'ONLINE-Elearning',
    lecturer: 'Coursera / Elearning',
    semester: 'Học kỳ 2 (2026-2027)',
    is_active: true,
  },
  {
    id: 106,
    school_name: 'Đại học Phenikaa',
    course_code: 'CSE702046',
    course_name: 'Phân tích nghiệp vụ kinh doanh (Lý thuyết)',
    day_of_week: 6,
    day_name: 'Thứ 6',
    start_time: '12:45',
    end_time: '15:25',
    room: 'A2-609.610',
    lecturer: 'Thầy Nguyễn Hoàng Anh',
    semester: 'Học kỳ 2 (2026-2027)',
    is_active: true,
  },
  {
    id: 107,
    school_name: 'Đại học Phenikaa',
    course_code: 'CSE702060-TH',
    course_name: 'Trực quan hoá dữ liệu (Thực hành)',
    day_of_week: 6,
    day_name: 'Thứ 6',
    start_time: '15:35',
    end_time: '18:15',
    room: 'A6-305 (PC)',
    lecturer: 'Thầy Đào Thiện Thành',
    semester: 'Học kỳ 2 (2026-2027)',
    is_active: true,
  },
]
