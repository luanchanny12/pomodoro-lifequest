import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60 giây giữ dữ liệu tươi (SWR)
      gcTime: 5 * 60 * 1000, // 5 phút lưu trữ trong RAM trước khi dọn rác (Garbage Collection)
      refetchOnWindowFocus: false, // Không tự ý fetch lại khi focus tránh giật lag UI
      retry: 1,
    },
  },
})
