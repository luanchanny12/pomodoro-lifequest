import api from '@/services/api'
import { authService } from '@/services/authService'

export const getVisitorId = (): string => {
  let vid = localStorage.getItem('lifequest_visitor_id')
  if (!vid) {
    vid = 'vis_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36)
    localStorage.setItem('lifequest_visitor_id', vid)
  }
  return vid
}

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent.toLowerCase()
  if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(ua)) {
    return 'tablet'
  }
  if (/(mobi|ipod|phone|blackberry|opera mini|fennec|minimo|symbian|psp|nintendo ds|archos)/.test(ua) || window.innerWidth < 768) {
    return 'mobile'
  }
  return 'desktop'
}

let lastTrackedPath = ''
let lastTrackedTime = 0

export const trackVisit = async (path?: string) => {
  try {
    const currentPath = path || window.location.pathname
    const now = Date.now()

    // Chống spam ghi nhận liên tục trong vòng 10 giây cùng 1 đường dẫn
    if (currentPath === lastTrackedPath && now - lastTrackedTime < 10000) {
      return
    }
    lastTrackedPath = currentPath
    lastTrackedTime = now

    const visitorId = getVisitorId()
    const deviceType = getDeviceType()
    const currentUser = authService.getCurrentUser()

    await api.post('/analytics/track-visit', {
      visitor_id: visitorId,
      is_member: Boolean(currentUser),
      user_id: currentUser ? currentUser.id : null,
      device_type: deviceType,
      path: currentPath,
      user_agent: navigator.userAgent,
    })
  } catch (err) {
    // Không làm ảnh hưởng luồng chính nếu lỗi mạng
    console.debug('Analytics track error:', err)
  }
}
