// App = 整体布局：左侧边栏 + 中间内容区 + 右侧详情区（SPEC §5 三栏框架）
// M2：标签管理、子任务进度、番茄钟、今日专注统计
import { useEffect, useState } from 'react'
import type { Db, Task, Tag, FocusSession } from './types'
import type { PomodoroState } from './components/PomodoroBar'
import PomodoroBar from './components/PomodoroBar'
import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Habits from './pages/Habits'
import ImportantDays from './pages/ImportantDays'
import Placeholder from './pages/Placeholder'

type PageKey =
  | 'today' | 'tasks' | 'calendar' | 'habits' | 'stats'
  | 'important' | 'album' | 'travel' | 'chat' | 'town'

const NAV: { key: PageKey; icon: string; label: string; soon?: string }[] = [
  { key: 'today', icon: '🏠', label: '今日' },
  { key: 'tasks', icon: '📋', label: '任务' },
  { key: 'calendar', icon: '📅', label: '月历' },
  { key: 'habits', icon: '✅', label: '习惯打卡' },
  { key: 'stats', icon: '📊', label: '数据统计', soon: 'M4' },
  { key: 'important', icon: '❤️', label: '重要日' },
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

const PALETTE = ['#3d7ea6', '#5b8c5a', '#c97b4a', '#8e6bb3', '#b85c5c', '#4a9e9e']

interface Pomo extends PomodoroState {
  startedAt: number
  totalMin: number
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export default function App() {
  const [db, setDb] = useState<Db>({ tasks: [], tags: [], focusSessions: [], settings: { theme: 'light' } })
  const [loaded, setLoaded] = useState(false)
  const [page, setPage] = useState<PageKey>('today')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pomoTarget, setPomoTarget] = useState<Task | null>(null) // 正在选时长的任务
  const [pomo, setPomo] = useState<Pomo | null>(null) // 进行中的番茄钟

  useEffect(() => {
    window.myharuto.getDb().then((d) => {
      setDb(d)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (loaded) window.myharuto.saveDb(db)
  }, [db, loaded])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', db.settings.theme === 'dark')
  }, [db.settings.theme])

  const toggleTheme = () =>
    setDb((d) => ({ ...d, settings: { theme: d.settings.theme === 'dark' ? 'light' : 'dark' } }))

  // ---------- 任务 ----------
  const addTask = (title: string, dueDate: string | null, tagId: string | null) =>
    setDb((d) => ({
      ...d,
      tasks: [
        { id: uid(), title, description: '', dueDate, done: false, createdAt: new Date().toISOString(), tagId, parentTaskId: null },
        ...d.tasks,
      ],
    }))

  const addSubtask = (parentId: string, title: string) =>
    setDb((d) => ({
      ...d,
      tasks: [
        ...d.tasks,
        { id: uid(), title, description: '', dueDate: null, done: false, createdAt: new Date().toISOString(),
          tagId: d.tasks.find((t) => t.id === parentId)?.tagId ?? null, parentTaskId: parentId },
      ],
    }))

  const updateTask = (id: string, patch: Partial<Task>) =>
    setDb((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))

  const deleteTask = (id: string) =>
    setDb((d) => ({
      ...d,
      // 删除主任务时连子任务一起删
      tasks: d.tasks.filter((t) => t.id !== id && t.parentTaskId !== id),
    }))

  // ---------- 标签 ----------
  const addTag = (name: string, color: string) =>
    setDb((d) => ({ ...d, tags: [...d.tags, { id: uid(), name, color, isSpecial: false }] }))

  // ---------- 习惯 ----------
  const addHabit = (name: string, icon: string) =>
    setDb((d) => ({
      ...d,
      habits: [...d.habits, { id: uid(), name, icon, monthlyTarget: 20, createdAt: new Date().toISOString() }],
    }))

  const toggleHabitCheck = (habitId: string, date: string) =>
    setDb((d) => {
      const exists = d.habitRecords.some((r) => r.habitId === habitId && r.date === date)
      return {
        ...d,
        habitRecords: exists
          ? d.habitRecords.filter((r) => !(r.habitId === habitId && r.date === date))
          : [...d.habitRecords, { id: uid(), habitId, date }],
      }
    })

  const setHabitTarget = (habitId: string, n: number) =>
    setDb((d) => ({ ...d, habits: d.habits.map((h) => (h.id === habitId ? { ...h, monthlyTarget: n } : h)) }))

  // ---------- 重要日 & 生理期 ----------
  const addImportantDay = (day: { title: string; type: 'birthday' | 'festival' | 'custom'; date: string; repeatYearly: boolean; remindDaysBefore: number; note: string }) =>
    setDb((d) => ({ ...d, importantDays: [...d.importantDays, { id: uid(), ...day }] }))

  const deleteImportantDay = (id: string) =>
    setDb((d) => ({ ...d, importantDays: d.importantDays.filter((x) => x.id !== id) }))

  const markPeriod = (date: string, kind: 'start' | 'end') =>
    setDb((d) => {
      if (kind === 'start')
        return { ...d, periodRecords: [...d.periodRecords, { id: uid(), startDate: date, endDate: null }] }
      // 标记结束：给进行中的记录补上 endDate
      return {
        ...d,
        periodRecords: d.periodRecords.map((r) => (!r.endDate && r.startDate < date ? { ...r, endDate: date } : r)),
      }
    })

  // ---------- 番茄钟 ----------
  const startPomo = (taskId: string, title: string, minutes: number) =>
    setPomo({ taskId, title, endAt: Date.now() + minutes * 60000, remainingMs: 0, running: true,
      startedAt: Date.now(), totalMin: minutes })

  const togglePomo = () =>
    setPomo((p) => {
      if (!p) return p
      if (p.running) return { ...p, running: false, remainingMs: Math.max(0, p.endAt - Date.now()) }
      return { ...p, running: true, endAt: Date.now() + p.remainingMs }
    })

  const completePomo = () =>
    setPomo((p) => {
      if (p) {
        const minutes = Math.max(1, Math.round((Date.now() - p.startedAt) / 60000))
        setDb((d) => ({
          ...d,
          focusSessions: [
            { id: uid(), taskId: p.taskId, startedAt: new Date(p.startedAt).toISOString(), minutes },
            ...d.focusSessions,
          ],
        }))
      }
      return null
    })

  // ---------- 派生数据 ----------
  const selected = db.tasks.find((t) => t.id === selectedId) ?? null
  const selectedChildren = selected ? db.tasks.filter((t) => t.parentTaskId === selected.id) : []
  const tagMap = new Map(db.tags.map((t) => [t.id, t]))
  const childrenOf = (id: string) => db.tasks.filter((t) => t.parentTaskId === id)
  const todayStr = new Date().toISOString().slice(0, 10)
  const todaySessions = db.focusSessions.filter((s) => s.startedAt.slice(0, 10) === todayStr)
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0)

  const taskProps = {
    tasks: db.tasks,
    tags: db.tags,
    focusSessions: db.focusSessions,
    onAdd: addTask,
    onAddSubtask: addSubtask,
    onUpdate: updateTask,
    onDelete: deleteTask,
    onAddTag: addTag,
    onPomodoro: (t: Task) => setPomoTarget(t),
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
        {/* 今日专注摘要 */}
        <div className="mx-3 mb-2 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2 text-xs text-neutral-500">
          今日专注 <b className="text-haruto-sea">{todayMinutes}</b> 分钟 · 🍅{todaySessions.length}
        </div>
        <button
          onClick={toggleTheme}
          className="m-3 mt-0 px-3 py-2 rounded-lg text-sm text-left hover:bg-black/5 dark:hover:bg-white/5"
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
        ) : page === 'calendar' ? (
          <Calendar tasks={db.tasks} tags={db.tags} onToggleTask={(id, done) => updateTask(id, { done })} />
        ) : page === 'habits' ? (
          <Habits
            habits={db.habits}
            habitRecords={db.habitRecords}
            onAddHabit={addHabit}
            onToggleCheck={toggleHabitCheck}
            onSetMonthlyTarget={setHabitTarget}
          />
        ) : page === 'important' ? (
          <ImportantDays
            importantDays={db.importantDays}
            periodRecords={db.periodRecords}
            onAddDay={addImportantDay}
            onDeleteDay={deleteImportantDay}
            onPeriodMark={markPeriod}
          />
        ) : (
          <Placeholder label={PLACEHOLDER_PAGE[page] ?? ''} />
        )}
      </main>

      {/* ===== 右栏：任务详情（SPEC §5.2：子任务/描述/AI留言/🍅） ===== */}
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
          {selected.tagId && tagMap.get(selected.tagId) && (
            <span
              className="inline-flex items-center gap-1.5 mt-2 text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: (tagMap.get(selected.tagId) as Tag).color + '22', color: (tagMap.get(selected.tagId) as Tag).color }}
            >
              ● {(tagMap.get(selected.tagId) as Tag).name}
            </span>
          )}
          <p className="mt-1 text-xs text-neutral-400">
            {selected.dueDate ? `📅 ${selected.dueDate}` : '无日期'} · 创建于 {selected.createdAt.slice(0, 10)}
          </p>

          {/* 子任务（SPEC F1：单击主任务展开，这里固定在详情栏，M2.1 再做列表内折叠展开） */}
          <div className="mt-5">
            <div className="flex justify-between text-xs font-medium text-neutral-500 mb-1.5">
              <span>子任务</span>
              {selectedChildren.length > 0 && (
                <span>{selectedChildren.filter((c) => c.done).length}/{selectedChildren.length}</span>
              )}
            </div>
            {selectedChildren.map((c) => (
              <label key={c.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={(e) => updateTask(c.id, { done: e.target.checked })}
                  className="accent-haruto-sea w-3.5 h-3.5"
                />
                <span className={`text-sm ${c.done ? 'line-through text-neutral-400' : ''}`}>{c.title}</span>
              </label>
            ))}
            <input
              placeholder="+ 添加子任务，回车保存"
              className="mt-1 w-full text-sm rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700
                bg-transparent px-3 py-2 outline-none focus:border-haruto-sea"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  addSubtask(selected.id, e.currentTarget.value.trim())
                  e.currentTarget.value = ''
                }
              }}
            />
          </div>

          <div className="mt-5">
            <div className="text-xs font-medium text-neutral-500 mb-1.5">描述</div>
            <textarea
              value={selected.description}
              onChange={(e) => updateTask(selected.id, { description: e.target.value })}
              placeholder="写任务描述…"
              className="w-full h-24 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700
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

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setPomoTarget(selected)}
              className="text-xs px-3 py-1.5 rounded-lg bg-haruto-sea text-white"
            >
              🍅 开始专注
            </button>
            <button
              onClick={() => { deleteTask(selected.id); setSelectedId(null) }}
              className="text-xs text-red-400 hover:text-red-500"
            >
              🗑 删除任务
            </button>
          </div>
        </aside>
      )}

      {/* 番茄钟（选时长 / 计时中） */}
      {(pomoTarget || pomo) && (
        <PomodoroBar
          task={pomoTarget}
          state={pomo}
          onStart={(taskId, title, minutes) => { startPomo(taskId, title, minutes); setPomoTarget(null) }}
          onToggle={togglePomo}
          onAbandon={() => { setPomo(null); setPomoTarget(null) }}
          onComplete={completePomo}
        />
      )}
    </div>
  )
}
