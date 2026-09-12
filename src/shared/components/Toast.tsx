// 全局轻量 Toast（RF-B1 补测 T1）：App 根级挂载（main.tsx），全项目经 useToast() 消费。
// 通用设计：message + duration 参数化，非硬编码文案；层 pointer-events-none 不阻塞交互。
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastItem {
  id: number
  message: string
}

interface ToastContextValue {
  show: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 必须在 <ToastProvider> 内使用')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const show = useCallback((message: string, duration = 2000) => {
    const id = nextId.current++
    setItems((list) => [...list, { id, message }])
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), duration)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 space-y-2">
        {items.map((t) => (
          <div
            key={t.id}
            className="rounded-lg bg-neutral-800/90 px-4 py-2 text-sm text-white shadow-lg"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
