import { useState, useEffect } from 'react'

/**
 * useDebounce Hook
 * Trì hoãn cập nhật giá trị cho đến khi người dùng ngừng gõ phím sau `delay` ms.
 * Tiết kiệm request API tìm kiếm và giảm re-render không cần thiết.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
