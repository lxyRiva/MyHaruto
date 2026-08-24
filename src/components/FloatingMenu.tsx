// 通用右键浮层菜单（支持二级子菜单：hover 右侧展开 + › 箭头）
import { useEffect, useRef, useState } from 'react'

export interface MenuEntry {
  label: string
  onClick?: () => void
  danger?: boolean
  header?: boolean // 分组标题，不可点击
  submenu?: MenuEntry[] // 悬停时在右侧展开二级菜单
}

function MenuList({ entries, onClose }: { entries: MenuEntry[]; onClose: () => void }) {
  const [openSub, setOpenSub] = useState<number | null>(null)

  return (
    <>
      {entries.map((e, i) =>
        e.header ? (
          <div key={i} className="px-3 pt-2 pb-1 text-[10px] font-medium text-neutral-400 tracking-wide">
            {e.label}
          </div>
        ) : e.submenu ? (
          // 父项：悬停展开右侧子菜单
          <div
            key={i}
            className="relative"
            onMouseEnter={() => setOpenSub(i)}
            onMouseLeave={() => setOpenSub(null)}
          >
            <button
              className="w-full flex items-center text-left px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-neutral-700 dark:text-neutral-200"
            >
              <span className="flex-1">{e.label}</span>
              <span className="ml-3 text-neutral-400 text-xs">›</span>
            </button>
            {openSub === i && (
              <div
                className="absolute left-full top-0 ml-1 min-w-36 max-h-72 overflow-y-auto rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700
                  bg-white dark:bg-neutral-800 py-1.5 text-sm animate-[fadeSlideIn_.12s_ease] z-10"
              >
                <MenuList entries={e.submenu} onClose={onClose} />
              </div>
            )}
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
    </>
  )
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

  // 点击菜单外部时关闭（滚轮滚动不关闭）
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
  const left = Math.min(x, window.innerWidth - 210)
  const top = Math.min(y, window.innerHeight - entries.length * 32 - 20)

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-44 max-h-80 overflow-y-auto rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700
        bg-white dark:bg-neutral-800 py-1.5 text-sm animate-[fadeSlideIn_.12s_ease]"
      style={{ left, top }}
    >
      <MenuList entries={entries} onClose={onClose} />
    </div>
  )
}
