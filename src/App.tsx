// App = 整体布局：左侧边栏 + 中间内容区 + 右侧详情区（SPEC §5 三栏框架）
import { useEffect, useState } from 'react'
import type { Db, Task } from './types'
import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Placeholder from './pages/Placeholder'

type PageKey =
  | 'today' | 'tasks' | 'calendar' | 'habits' | 'stats'
  | 'important' | 'album' | 'travel' | 'chat' | 'town'

const NAV: { key: PageKey; icon: string; label: string; soon?: string }[] = [
  { key: 'today', icon: '🏠', label: '今日' },
  { key: 'tasks', icon: '📋', label: '任务' },
  { key: 'calendar', icon: '📅', label: '月历', soon: 'M3' },
  { key: 'habits', icon: '✅', label: '习惯打卡', soon: 'M3' },
  { key: 'stats', icon: '📊', label: '数据统计', soon: 'M4' },
  { key: 'important', icon: '❤️', label: '重要日', soon: 'M7' },
  { key: 'album', icon: '🎬', label: '书影清单', soon: 'V2' },
  { key: 'travel', icon: '✈️', label: '旅游札记', soon: 'V2' },
  { key: 'chat', icon: '💬', label: 'Haruto', soon: 'M5' },
  { key: 'town', icon: '🏘', label: '小镇', soon: 'V3' },
]

const PLACEHOLDER_PAGE: Partial<Record<PageKey, string>> = {
  calendar: '月历', habits: '习惯打卡', stats: '数据统计',
  important: '重要日', album: '书影清单', travel: '旅游札记',
  chat: 'Haruto 聊天', town: '小镇',
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export default function App() {
  const [db, setDb] = useState<Db>({ tasks: [], settings: { theme: 'light' } })
  const [loaded, setLoaded] = useState(false)
  const [page, setPage] = useState<PageKey>('today')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // 启动时：从仓库把数据搬进来
  useEffect(() => {
    window.myharuto.getDb().then((d) => {
      setDb(d)
      setLoaded(true)
    })
  }, [])

  // 数据一变就存回仓库
  useEffect(() => {
    if (loaded) window.myharuto.saveDb(db)
  }, [db, loaded])

  // 主题切换（同时记进设置里，下次打开还是你选的）
  useEffect(() => {
    document.documentElement.classList.toggle('dark', db.settings.theme === 'dark')
  }, [db.settings.theme])

  const toggleTheme = () =>
    setDb((d) => ({
      ...d,
      settings: { theme: d.settings.theme === 'dark' ? 'light' : 'dark' },
    }))

  // ---- 任务的增删改（今日页和任务页共用） ----
  const addTask = (title: string, dueDate: string | null) =>
    setDb((d) => ({
      ...d,
      tasks: [
        { id: uid(), title, description: '', dueDate, done: false, createdAt: new Date().toISOString() },
        ...d.tasks,
      ],
    }))

  const updateTask = (id: string, patch: Partial<Task>) =>
    setDb((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))

  const deleteTask = (id: string) =>
    setDb((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }))

  const selected = db.tasks.find((t) => t.id === selectedId) ?? null

  const taskProps = {
    tasks: db.tasks,
    onAdd: addTask,
    onUpdate: updateTask,
    onDelete: deleteTask,
    selectedId,
    onSelect: (id: string | null) => setSelectedId(id),
  }

  return (
    <div className="flex h-full">
      {/* ===== 侧边栏 ===== */}
      <aside className="w-[220px] shrink-0 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-[#f5f5f4] dark:bg-[#121212]">
        <div className="h-14 flex items-center gap-2 px-5 font-bold tracking-wide">
          <span className="text-lg">🌙</span> MyHaruto
        </div>
        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {NAV.map((n) => {
            const active = page === n.key
            const disabled = !!n.soon
            return (
              <button
                key={n.key}
                onClick={() => !disabled && setPage(n.key)}
                disabled={disabled}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                  ${active
                    ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                    : disabled
                      ? 'text-neutral-400 dark:text-neutral-600 cursor-default'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <span>{n.icon}</span> {n.label}
                {n.soon && <span className="ml-auto text-[10px] text-neutral-400">{n.soon}</span>}
              </button>
            )
          })}
        </nav>
        <button
          onClick={toggleTheme}
          className="m-3 px-3 py-2 rounded-lg text-sm text-left hover:bg-black/5 dark:hover:bg-white/5"
        >
          {db.settings.theme === 'dark' ? '☀️ 日间模式' : '🌙 夜间模式'}
        </button>
      </aside>

      {/* ===== 中栏 ===== */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {!loaded ? (
          <div className="h-full grid place-items-center text-neutral-400">加载中…</div>
        ) : page === 'today' ? (
          <Today {...taskProps} />
        ) : page === 'tasks' ? (
          <Tasks {...taskProps} />
        ) : (
          <Placeholder label={PLACEHOLDER_PAGE[page] ?? ''} />
        )}
      </main>

      {/* ===== 右栏：任务详情（SPEC §5.2 任务页结构） ===== */}
      {selected && (
        <aside className="w-[320px] shrink-0 border-l border-neutral-200 dark:border-neutral-800 p-5 overflow-y-auto">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold text-[15px] leading-snug break-all">
              {selected.done ? '✅ ' : ''}{selected.title}
            </h2>
            <button
              onClick={() => setSelectedId(null)}
              className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
              title="收起"
            >
              ×
            </button>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            {selected.dueDate ? `📅 ${selected.dueDate}` : '无日期'} · 创建于 {selected.createdAt.slice(0, 10)}
          </p>

          <div className="mt-5">
            <div className="text-xs font-medium text-neutral-500 mb-1.5">描述</div>
            <textarea
              value={selected.description}
              onChange={(e) => updateTask(selected.id, { description: e.target.value })}
              placeholder="双击任务可改标题，这里写任务描述…"
              className="w-full h-28 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700
                bg-white dark:bg-neutral-900 p-3 outline-none focus:border-haruto-sea resize-none"
            />
          </div>

          {/* AI 留言区（M6 上线后 Haruto 在这里写海蓝斜体留言） */}
          <div className="mt-5">
            <div className="text-xs font-medium text-neutral-500 mb-1.5">💬 Haruto 的留言</div>
            <div className="rounded-lg border border-dashed border-haruto-sea/30 p-3 text-sm italic text-haruto-sea/60">
              "……"（他每天会来读你的任务，挑 2-3 条在这里留言）
            </div>
          </div>

          <button
            onClick={() => { deleteTask(selected.id); setSelectedId(null) }}
            className="mt-6 text-xs text-red-400 hover:text-red-500"
          >
            🗑 删除任务
          </button>
        </aside>
      )}
    </div>
  )
}
