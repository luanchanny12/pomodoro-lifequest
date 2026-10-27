export interface MotivationalQuote {
  id: number
  quote: string
  author: string
  category: 'perseverance' | 'discipline' | 'habit' | 'focus' | 'wisdom'
  energyTag: string
}

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    id: 1,
    quote: "Hành trình vạn dặm bắt đầu từ một bước chân. 30 phút hôm nay đưa bạn gần hơn đến 1000 giờ thành thạo.",
    author: "Lão Tử",
    category: "perseverance",
    energyTag: "🌱 Bước đầu vững chắc",
  },
  {
    id: 2,
    quote: "Mỗi ngày bạn tốt hơn 1%, sau một năm bạn sẽ giỏi hơn gấp 37 lần. Sự tích lũy âm thầm tạo nên kỳ tích.",
    author: "James Clear (Atomic Habits)",
    category: "habit",
    energyTag: "🔥 Lãi kép tri thức",
  },
  {
    id: 3,
    quote: "Kỷ luật là chiếc cầu nối duy nhất giữa mục tiêu và sự thành tựu.",
    author: "Jim Rohn",
    category: "discipline",
    energyTag: "⚡ Sức mạnh kỷ luật",
  },
  {
    id: 4,
    quote: "Đừng đếm các ngày trôi qua. Hãy làm cho mỗi ngày trôi qua đều đáng đếm.",
    author: "Muhammad Ali",
    category: "focus",
    energyTag: "🥊 Chiến binh bền bỉ",
  },
  {
    id: 5,
    quote: "Nỗi đau của kỷ luật chỉ tính bằng gram, nhưng nỗi đau của sự hối tiếc tính bằng tấn.",
    author: "Jim Rohn",
    category: "discipline",
    energyTag: "🎯 Quyết tâm sắt đá",
  },
  {
    id: 6,
    quote: "1000 giờ không phải là bức tường ngăn cách bạn, mà là con đường chứng minh bạn xứng đáng với phiên bản tốt nhất của mình.",
    author: "Life Quest Focus",
    category: "perseverance",
    energyTag: "💎 Khắc cốt ghi tâm",
  },
  {
    id: 7,
    quote: "Người kiên trì chiến thắng không phải vì họ không bao giờ mệt mỏi, mà vì họ không bao giờ từ bỏ.",
    author: "Khuyết danh",
    category: "perseverance",
    energyTag: "🛡️ Tinh thần bất khuất",
  },
  {
    id: 8,
    quote: "Bạn không cần phải phi thường để bắt đầu, nhưng bạn phải bắt đầu để trở nên phi thường.",
    author: "Zig Ziglar",
    category: "habit",
    energyTag: "🚀 Khởi động ngay",
  },
  {
    id: 9,
    quote: "Tập trung sâu trong 25 phút Pomodoro đáng giá hơn 3 tiếng vừa học vừa lướt điện thoại.",
    author: "Deep Work Insight",
    category: "focus",
    energyTag: "🧠 Tập trung tuyệt đối",
  },
  {
    id: 10,
    quote: "Nói tiếng Anh hay học bất kỳ kỹ năng nào cũng giống như tưới cây: nước của ngày hôm nay nuôi dưỡng hoa thơm của ngày mai.",
    author: "Khuyết danh",
    category: "wisdom",
    energyTag: "🌸 Mầm xanh tri thức",
  },
  {
    id: 11,
    quote: "Thời điểm tốt nhất để trồng cây là 20 năm trước. Thời điểm tốt thứ hai là ngay BÂY GIỜ.",
    author: "Tục ngữ",
    category: "wisdom",
    energyTag: "⏳ Nắm bắt hiện tại",
  },
  {
    id: 12,
    quote: "Không có bí mật nào cho sự thành công. Nó là kết quả của sự chuẩn bị, nỗ lực và học hỏi từ mỗi buổi học.",
    author: "Colin Powell",
    category: "discipline",
    energyTag: "🏆 Từng bước vững chắc",
  },
  {
    id: 13,
    quote: "Chỉ cần bạn không dừng lại, việc bạn đi chậm đến đâu không thành vấn đề.",
    author: "Khổng Tử",
    category: "perseverance",
    energyTag: "🐢 Bền bỉ phi thường",
  },
  {
    id: 14,
    quote: "Đừng sợ nói sai. Mỗi lần nói sai là não bộ của bạn đang tự sửa chữa để nói chuẩn hơn.",
    author: "Nguyên lý hấp thu ngôn ngữ",
    category: "wisdom",
    energyTag: "🗣️ Tự tin bứt phá",
  },
  {
    id: 15,
    quote: "Cảm giác hoàn thành một buổi học sâu luôn ngọt ngào hơn gấp trăm lần sự lười biếng nhất thời.",
    author: "Pomodoro Focus",
    category: "focus",
    energyTag: "✨ Hạnh phúc kỷ luật",
  },
  {
    id: 16,
    quote: "Thành công là tổng hòa của những nỗ lực nhỏ bé được lặp đi lặp lại ngày này qua ngày khác.",
    author: "Robert Collier",
    category: "habit",
    energyTag: "🔄 Lặp lại để xuất chúng",
  },
  {
    id: 17,
    quote: "Khó khăn hôm nay là sức mạnh cho ngày mai. Cố thêm 25 phút nữa nào!",
    author: "Khuyết danh",
    category: "perseverance",
    energyTag: "💪 Vượt qua giới hạn",
  },
  {
    id: 18,
    quote: "Khi bạn muốn từ bỏ, hãy nhớ lại lý do vì sao bạn đã bắt đầu mục tiêu này.",
    author: "Khuyết danh",
    category: "discipline",
    energyTag: "🔥 Thắp sáng lý do",
  },
  {
    id: 19,
    quote: "Bộ não giống như cơ bắp: bạn càng thử thách nó bằng sự tập trung, nó càng trở nên sắc bén và kiên cường.",
    author: "Khoa học thần kinh",
    category: "wisdom",
    energyTag: "⚡ Bộ não siêu phàm",
  },
  {
    id: 20,
    quote: "Hôm nay bạn học vì tương lai mà bạn mơ ước. Hãy tự hào về từng phút bạn đang đầu tư cho chính mình!",
    author: "Pomodoro Goal Hub",
    category: "wisdom",
    energyTag: "🌟 Tự hào bản thân",
  },
]

export function getDailyQuote(): MotivationalQuote {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - startOfYear.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  const dayOfYear = Math.floor(diff / oneDay)
  
  const index = dayOfYear % MOTIVATIONAL_QUOTES.length
  return MOTIVATIONAL_QUOTES[index]
}

export function getRandomQuote(excludeId?: number): MotivationalQuote {
  const candidates = MOTIVATIONAL_QUOTES.filter((q) => q.id !== excludeId)
  const randomIndex = Math.floor(Math.random() * candidates.length)
  return candidates[randomIndex] || MOTIVATIONAL_QUOTES[0]
}
