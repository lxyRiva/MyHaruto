// L1 图标导航栏（线性图标）。RF-P3b 自 App 原样迁出（不含排序功能，L1 排序归 RF-P3c）
import { IconTasks, IconTimer, IconCalendar, IconCheck, IconChart, IconHeart, IconFilm, IconPlane, IconChat, IconTown, IconSun, IconMoon, IconSettings } from '../../shared/components/icons'
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

export default function L1Sidebar({ page, aiName, theme, onNav, onOpenSettings, onToggleTheme }: {
  page: PageKey
  aiName: string
  theme: string
  onNav: (key: PageKey) => void
  onOpenSettings: () => void
  onToggleTheme: () => void
}) {
  return (
    <aside className="w-14 shrink-0 flex flex-col items-center border-r border-neutral-200 dark:border-neutral-800 bg-[#f5f5f4] dark:bg-[#121212] py-3 gap-1">
      <div className="mb-2 text-haruto-sea" title="MyHaruto">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />
        </svg>
      </div>
      {NAV.map((n) => {
        const active = page === n.key
        const disabled = !!n.soon
        const Icon = n.icon
        return (
          <button
            key={n.key}
            onClick={() => !disabled && onNav(n.key)}
            disabled={disabled}
            title={n.key === 'chat' ? aiName : n.label}
            className={`w-10 h-10 grid place-items-center rounded-xl transition-all
              ${active
                ? 'bg-haruto-sea/15 text-haruto-sea'
                : disabled
                  ? 'text-neutral-300 dark:text-neutral-700 cursor-default'
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
  )
}
