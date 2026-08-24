// 通用右键浮层菜单（Electron 下系统弹窗失效，一切菜单自己画）
import { useEffect, useRef } from 'react'

export interface MenuEntry {
  label: string
  onClick?: () => void
  danger?: boolean
  header?: boolean // 分组标题，不可点击
  icon?: string // 左侧小图标（线性风格描述用，暂用符号）
}

export default function FloatingMenu({
  x, y, entries, onClose,
}: {
  x: number
  y: number
  entries: MenuEntry[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // 点击菜单外部时关闭（滚轮滚动不关闭——修复：下滑页面菜单消失的 bug）
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('mousedown', h)
    return () => {
      window.removeEventListener('mousedown', h)
    }
  }, [onClose])

  // 防止贴边溢出
  const left = Math.min(x, window.innerWidth - 200)
  const top = Math.min(y, window.innerHeight - entries.length * 32 - 20)

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-44 max-h-80 overflow-y-auto rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700
        bg-white dark:bg-neutral-800 py-1.5 text-sm animate-[fadeSlideIn_.12s_ease]"
      style={{ left, top }}
    >
      {entries.map((e, i) =>
        e.header ? (
          <div key={i} className="px-3 pt-2 pb-1 text-[10px] font-medium text-neutral-400 tracking-wide">
            {e.label}
          </div>
        ) : (
          <button
            key={i}
            onClick={() => {
              e.onClick?.()
              onClose()
            }}
            className={`w-full text-left px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors
              ${e.danger ? 'text-red-500' : 'text-neutral-700 dark:text-neutral-200'}`}
          >
            {e.label}
          </button>
        )
      )}
    </div>
  )
}
