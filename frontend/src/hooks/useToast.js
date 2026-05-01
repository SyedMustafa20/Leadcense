import { useState, useCallback, useRef } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const showToast = useCallback((message, type = 'error') => {
    clearTimeout(timer.current)
    setToast({ message, type })
    timer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const hideToast = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  return { toast, showToast, hideToast }
}
