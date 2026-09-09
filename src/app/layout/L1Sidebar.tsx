// L1 图标导航栏（线性图标）。RF-P3b 自 App 原样迁出
// RF-P3c：L1 排序（遗留④，产品拍板）——右键 上移/下移/恢复默认，顺序存 mh-l1-order（PageKey 数组，
// useLocalStorage 持久化）；chat/town 锚底不可动；album/travel 去 disabled 改置灰——左键进占位页、右键参与排序
import { useState } from 'react'
import { IconTasks, IconTimer, IconCalendar, IconCheck, IconChart, IconHeart, IconFilm, IconPlane, IconChat, IconTown, IconSun, IconMoon, IconSettings } from '../../shared/components/icons'
import FloatingMenu, { type MenuEntry } from '../../shared/components/FloatingMenu'
import { useLocalStorage } from '../../shared/hooks/useLocalStorage'
import type { PageKey } from '../../App'

const NAV: { key: PageKey; icon: () => JSX.Element; label: string; soon?: string }[] = [
  { key: 'tasks', icon: IconTasks, label: '任务' },
  { key: 'focus', icon: IconTimer, label: '专注' },
  { key: 'calendar', icon: IconCalendar, label: '月历' },
  { key: 'habits', icon: IconCheck, label: '习惯打卡' },
  { key: 'stats', icon: IconChart, label: '数据统计' },
  { key: 'important', icon: IconHeart, label: '重要日' },
  { key: 'album', icon: IconFilm, label: '书影清单', soon: 'V2' },
  { key: 'travel', icon: IconPlane, label: '旅游札记', soon: 'V2' },
  { key: 'chat', icon: IconChat, label: 'AI 伙伴', soon: 'M5' }, // 悬浮标题动态显示 aiName
  { key: 'town', icon: IconTown, label: '小镇', soon: 'V3' },
]

// 锚底项：永远排最后，不参与上移/下移（产品拍板）
const ANCHORED: PageKey[] = ['chat', 'town']

export default function L1Sidebar({ page, aiName, theme, onNav, onOpenSettings, onToggleTheme }: {
  page: PageKey
  aiName: string
  theme: string
  onNav: (key: PageKey) => void
  onOpenSettings: () => void
  onToggleTheme: () => void
}) {
  // 自定义顺序（null = 默认 NAV 序）；mh-l1-order 为 P3c 新键，无存量兼容问题
  const [l1Order, setL1Order] = useLocalStorage<PageKey[] | null>('mh-l1-order', null)
  const [menu, setMenu] = useState<{ key: PageKey; x: number; y: number } | null>(null)

  // 渲染序：自定义序 ∩ 可动项在前，未覆盖项按 NAV 序补后，锚底项强制最后
  const orderedKeys = (() => {
    const movable = NAV.filter((n) => !ANCHORED.includes(n.key)).map((n) => n.key)
    const custom = (l1Order ?? []).filter((k) => movable.includes(k))
    const ordered = [...custom, ...movable.filter((k) => !custom.includes(k))]
    return [...ordered, ...ANCHORED]
  })()
  const orderedNav = orderedKeys.map((k) => NAV.find((n) => n.key === k)!).filter(Boolean)

  // 上移/下移：只在可动项序列内交换（锚底项永不参与），写回 localStorage
  const move = (key: PageKey, dir: -1 | 1) => {
    const movable = orderedKeys.filter((k) => !ANCHORED.includes(k))
    const i = movable.indexOf(key)
    const j = i + dir
    if (i < 0 || j < 0 || j >= movable.length) return
    ;[movable[i], movable[j]] = [movable[j], movable[i]]
    setL1Order(movable)
  }
  const resetOrder = () => setL1Order(null)

  const menuEntries = (): MenuEntry[] => {
    if (!menu) return []
    return [
      { label: '上移', onClick: () => move(menu.key, -1) },
      { label: '下移', onClick: () => move(menu.key, 1) },
      { label: '恢复默认', onClick: resetOrder },
    ]
  }

  return (
    <>
      <aside className="w-14 shrink-0 flex flex-col items-center border-r border-neutral-200 dark:border-neutral-800 bg-[#f5f5f4] dark:bg-[#121212] py-3 gap-1">
        <div className="mb-2 text-haruto-sea" title="MyHaruto">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />
          </svg>
        </div>
        {orderedNav.map((n) => {
          const active = page === n.key
          const anchored = ANCHORED.includes(n.key)
          const grayed = !!n.soon // 未上线页：置灰但可点（进占位页），右键参与排序
          const Icon = n.icon
          return (
            <button
              key={n.key}
              onClick={() => onNav(n.key)}
              onContextMenu={(e) => {
                e.preventDefault()
                if (anchored) return // chat/town 锚底不可动，不弹菜单
                setMenu({ key: n.key, x: e.clientX, y: e.clientY })
              }}
              title={n.key === 'chat' ? aiName : n.label}
              className={`w-10 h-10 grid place-items-center rounded-xl transition-all
                ${active
                  ? 'bg-haruto-sea/15 text-haruto-sea'
                  : grayed
                    ? 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/10'}`}
            >
              <Icon />
            </button>
          )
        })}
        <div className="flex-1" />
        <button
          onClick={onOpenSettings}
          title="设置"
          className="w-10 h-10 grid place-items-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <IconSettings />
        </button>
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? '切换日间模式' : '切换夜间模式'}
          className="w-10 h-10 grid place-items-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/10"
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </aside>

      {menu && <FloatingMenu x={menu.x} y={menu.y} entries={menuEntries()} onClose={() => setMenu(null)} />}
    </>
  )
}
