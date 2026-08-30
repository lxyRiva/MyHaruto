// App = 三层结构：L1 图标导航栏 → L2 清单树（任务模块）→ L3 内容区 + 右侧详情
import { useEffect, useRef, useState } from 'react'
import type { Db, Task, Tag, Habit, ImportantDay } from './types'
import PomodoroBar from './components/PomodoroBar'
import { IconTasks, IconTimer, IconCalendar, IconCheck, IconChart, IconHeart, IconFilm, IconPlane, IconChat, IconTown, IconSun, IconMoon } from './components/icons'
import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Habits from './pages/Habits'
import Stats from './pages/Stats'
import ImportantDays from './pages/ImportantDays'
import PomodoroPage from './pages/PomodoroPage'
import Placeholder from './pages/Placeholder'

type PageKey =
  | 'today' | 'tasks' | 'calendar' | 'habits' | 'stats' | 'focus'
  | 'important' | 'album' | 'travel' | 'chat' | 'town'

const NAV: { key: PageKey; icon: () => JSX.Element; label: string; soon?: string }[] = [
  { key: 'tasks', icon: IconTasks, label: '任务' },
  { key: 'focus', icon: IconTimer, label: '专注' },
  { key: 'calendar', icon: IconCalendar, label: '月历' },
  { key: 'habits', icon: IconCheck, label: '习惯打卡' },
  { key: 'stats', icon: IconChart, label: '数据统计' },
  { key: 'important', icon: IconHeart, label: '重要日' },
  { key: 'album', icon: IconFilm, label: '书影清单', soon: 'V2' },
  { key: 'travel', icon: IconPlane, label: '旅游札记', soon: 'V2' },
  { key: 'chat', icon: IconChat, label: 'Haruto', soon: 'M5' },
  { key: 'town', icon: IconTown, label: '小镇', soon: 'V3' },
]

const PLACEHOLDER_PAGE: Partial<Record<PageKey, string>> = {
  album: '书影清单', travel: '旅游札记', chat: 'Haruto 聊天', town: '小镇',
}

const PALETTE = ['#3d7ea6', '#5b8c5a', '#c97b4a', '#8e6bb3', '#b85c5c', '#4a9e9e']

interface Pomo {
  taskId: string
  title: string
  mode: 'countdown' | 'stopwatch'
  startedAt: number
  totalMin: number
  endAt: number // stopwatch 为 0
  remainingMs: number
  running: boolean
  swAccum: number // 正计时累计毫秒（暂停不清零）
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export default function App() {
  const [db, setDb] = useState<Db>({ tasks: [], tags: [], subTags: [], sections: [], focusSessions: [], habits: [], habitRecords: [], importantDays: [], periodRecords: [], sleepRecords: [], settings: { theme: 'light', harutoMetDate: '', currentCharacterId: 'haruto', skinId: 'default' } })
  const [loaded, setLoaded] = useState(false)
  const [page, setPage] = useState<PageKey>('today')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pomoTarget, setPomoTarget] = useState<Task | null>(null)
  const [pomo, setPomo] = useState<Pomo | null>(null)
  const pomoCompletingRef = useRef(false) // 完成互斥锁（防双组件重复记录）
  // L2 清单树选中项
  const [activeListId, setActiveListId] = useState<string>('all')
  // 新建清单表单
  const [addingList, setAddingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState(PALETTE[0])

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
    setDb((d) => ({ ...d, settings: { ...d.settings, theme: d.settings.theme === 'dark' ? 'light' : 'dark' } }))

  // ---------- 任务 ----------
  const addTask = (title: string, dueDate: string | null, tagId: string | null) =>
    setDb((d) => ({
      ...d,
      tasks: [
        { id: uid(), title, description: '', dueDate, done: false, createdAt: new Date().toISOString(),
          tagId, parentTaskId: null, priority: 'none', masterTaskId: null, isPinnedToday: false,
          sectionId: null, checklistItems: [], taskComments: [] },
        ...d.tasks,
      ],
    }))

  const addSubtask = (parentId: string, title: string) =>
    setDb((d) => ({
      ...d,
      tasks: [
        ...d.tasks,
        { id: uid(), title, description: '', dueDate: null, done: false, createdAt: new Date().toISOString(),
          tagId: d.tasks.find((t) => t.id === parentId)?.tagId ?? null, parentTaskId: parentId, priority: 'none',
          sectionId: null, checklistItems: [], taskComments: [] },
      ],
    }))

  const updateTask = (id: string, patch: Partial<Task>) =>
    setDb((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))

  const deleteTask = (id: string) =>
    setDb((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id && t.parentTaskId !== id) }))

  // ---------- 清单（标签） ----------
  const addTag = (name: string, color: string) =>
    setDb((d) => ({ ...d, tags: [...d.tags, { id: uid(), name, color, isSpecial: false }] }))

  // ---------- 习惯 ----------
  const addHabit = (name: string, icon: string) =>
    setDb((d) => ({ ...d, habits: [...d.habits, { id: uid(), name, icon, monthlyTarget: 20, createdAt: new Date().toISOString() }] }))

  const updateHabit = (id: string, patch: Partial<Pick<Habit, 'name' | 'icon' | 'monthlyTarget'>>) =>
    setDb((d) => ({ ...d, habits: d.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) }))

  const deleteHabit = (id: string) =>
    setDb((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id), habitRecords: d.habitRecords.filter((r) => r.habitId !== id) }))

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

  // ---------- 重要日 & 生理期 ----------
  const addImportantDay = (day: Omit<ImportantDay, 'id'>) =>
    setDb((d) => ({ ...d, importantDays: [...d.importantDays, { id: uid(), ...day }] }))

  const updateImportantDay = (id: string, patch: Partial<ImportantDay>) =>
    setDb((d) => ({ ...d, importantDays: d.importantDays.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))

  const deleteImportantDay = (id: string) =>
    setDb((d) => ({ ...d, importantDays: d.importantDays.filter((x) => x.id !== id) }))

  const markPeriod = (date: string, kind: 'start' | 'end') =>
    setDb((d) => {
      if (kind === 'start')
        return { ...d, periodRecords: [...d.periodRecords, { id: uid(), startDate: date, endDate: null }] }
      return {
        ...d,
        periodRecords: d.periodRecords.map((r) => (!r.endDate && r.startDate < date ? { ...r, endDate: date } : r)),
      }
    })

  const deletePeriod = (startDate: string) =>
    setDb((d) => ({ ...d, periodRecords: d.periodRecords.filter((p) => p.startDate !== startDate) }))

  // ---------- 番茄钟 ----------
  const startPomo = (minutes: number, mode: 'countdown' | 'stopwatch' = 'countdown') => {
    if (!pomoTarget) return
    setPomo({
      taskId: pomoTarget.id, title: pomoTarget.title, mode, startedAt: Date.now(),
      totalMin: minutes, endAt: mode === 'countdown' ? Date.now() + minutes * 60000 : 0,
      remainingMs: mode === 'countdown' ? minutes * 60000 : 0, running: true, swAccum: 0,
    })
  }

  const togglePomo = () =>
    setPomo((p) => {
      if (!p) return p
      if (p.running) {
        // 暂停：记下剩余/累计
        return {
          ...p,
          running: false,
          remainingMs: p.mode === 'countdown' ? Math.max(0, p.endAt - Date.now()) : 0,
          swAccum: p.mode === 'stopwatch' ? p.swAccum + (Date.now() - p.startedAt) : 0,
        }
      }
      // 继续：从暂停点接续（正计时 startedAt 重置为现在，累计增量进 swAccum，避免双倍计数）
      return {
        ...p,
        running: true,
        endAt: p.mode === 'countdown' ? Date.now() + p.remainingMs : 0,
        startedAt: Date.now(),
      }
    })

  const completePomo = () => {
    // 互斥锁：浮动条和专注页都可能触发"到点完成"，确保只记一次
    if (pomoCompletingRef.current || !pomo) return
    pomoCompletingRef.current = true
    const minutes = Math.max(1, Math.round((Date.now() - pomo.startedAt) / 60000))
    setDb((d) => ({
      ...d,
      focusSessions: [
        { id: uid(), taskId: pomo.taskId, startedAt: new Date(pomo.startedAt).toISOString(), minutes },
        ...d.focusSessions,
      ],
    }))
    setPomo(null)
    setTimeout(() => { pomoCompletingRef.current = false }, 50)
  }

  // ---------- 派生 ----------
  const selected = db.tasks.find((t) => t.id === selectedId) ?? null
  const selectedChildren = selected ? db.tasks.filter((t) => t.parentTaskId === selected.id) : []
  const tagMap = new Map(db.tags.map((t) => [t.id, t]))
  const todayStr = new Date().toISOString().slice(0, 10)
  const todaySessions = db.focusSessions.filter((s) => s.startedAt.slice(0, 10) === todayStr)
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0)
  const mainTasks = db.tasks.filter((t) => !t.parentTaskId)
  const specialTags = db.tags.filter((t) => t.isSpecial)
  const normalTags = db.tags.filter((t) => !t.isSpecial)
  const countOf = (id: string) =>
    id === 'all' ? mainTasks.filter((t) => !t.done).length
    : id === 'today' ? mainTasks.filter((t) => !t.done && (t.dueDate === todayStr || t.isPinnedToday)).length
    : mainTasks.filter((t) => t.tagId === id && !t.done).length

  const taskProps = {
    tasks: db.tasks,
    tags: db.tags,
    onAdd: addTask,
    onAddSub: addSubtask,
    onUpdate: updateTask,
    onDelete: deleteTask,
    onPomodoro: (t: Task) => setPomoTarget(t),
    selectedId,
    onSelect: (id: string | null) => setSelectedId(id),
  }

  // 专注页任务池：符合条件的主任务 + 它们的全部子任务（子任务可独立计时，问题2）
  const focusMainIds = new Set(
    mainTasks.filter((t) => !t.done && (!t.dueDate || t.dueDate <= todayStr)).map((t) => t.id)
  )
  const focusPool = db.tasks.filter(
    (t) => !t.done && (focusMainIds.has(t.id) || (t.parentTaskId && focusMainIds.has(t.parentTaskId)))
  )

  // L2 清单树行
  const ListRow = ({ id, icon, label, color }: { id: string; icon?: string; label: string; color?: string }) => (
    <button
      onClick={() => { setActiveListId(id); setPage('tasks') }}
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
        ${activeListId === id && page === 'tasks'
          ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
          : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
    >
      {color
        ? <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        : <span className="w-4 text-center text-xs shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
      <span className="ml-auto text-[10px] text-neutral-400 tabular-nums">{countOf(id)}</span>
    </button>
  )

  return (
    <div className="flex h-full">
      {/* ===== L1：图标导航栏（线性图标，问题2） ===== */}
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
              onClick={() => !disabled && setPage(n.key)}
              disabled={disabled}
              title={n.label}
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
          onClick={toggleTheme}
          title={db.settings.theme === 'dark' ? '切换日间模式' : '切换夜间模式'}
          className="w-10 h-10 grid place-items-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/10"
        >
          {db.settings.theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </aside>

      {/* ===== L2：清单树（任务模块+今天页共用，问题1：今天收进清单树顶部） ===== */}
      {(page === 'tasks' || page === 'today') && (
        <aside className="w-52 shrink-0 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-[#fafaf9] dark:bg-[#181818] py-4">
          <div className="px-3 text-xs font-bold text-neutral-400 tracking-widest mb-2">清单</div>
          <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
            <button
              onClick={() => setPage('today')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                ${page === 'today'
                  ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <IconSun />
              <span>今天</span>
              <span className="ml-auto text-[10px] text-neutral-400 tabular-nums">{countOf('today')}</span>
            </button>
            <ListRow id="all" icon="🗂" label="全部" />
            {specialTags.length > 0 && (
              <div className="pt-2 pb-0.5 px-3 text-[10px] font-medium text-neutral-400 tracking-wide">我的愿景</div>
            )}
            {specialTags.map((t) => (
              <ListRow key={t.id} label={t.name} color={t.color} id={t.id} />
            ))}
            <div className="pt-2 pb-0.5 px-3 text-[10px] font-medium text-neutral-400 tracking-wide">清单</div>
            {normalTags.map((t) => (
              <ListRow key={t.id} label={t.name} color={t.color} id={t.id} />
            ))}
            {addingList ? (
              <div className="px-1 pt-1">
                <input
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newListName.trim()) {
                      addTag(newListName.trim(), newListColor)
                      setNewListName(''); setAddingList(false)
                    }
                    if (e.key === 'Escape') setAddingList(false)
                  }}
                  placeholder="清单名，回车创建"
                  className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-600
                    bg-white dark:bg-neutral-900 px-2 py-1.5 outline-none focus:border-haruto-sea"
                />
                <div className="flex gap-1 mt-1.5 px-1">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewListColor(c)}
                      className={`w-3.5 h-3.5 rounded-full ${newListColor === c ? 'ring-2 ring-offset-1 ring-neutral-400' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingList(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 mt-1 rounded-lg text-xs text-neutral-400 hover:text-haruto-sea transition-colors"
              >
                ＋ 新建清单
              </button>
            )}
          </nav>
          <div className="mx-2 mt-2 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2 text-[10px] text-neutral-500">
            今日专注 <b className="text-haruto-sea">{todayMinutes}</b> 分钟 · 🍅{todaySessions.length}
          </div>
        </aside>
      )}

      {/* ===== L3：内容区 ===== */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {!loaded ? (
          <div className="h-full grid place-items-center text-neutral-400">加载中…</div>
        ) : page === 'today' ? (
          <Today {...taskProps} />
        ) : page === 'tasks' ? (
          <Tasks {...taskProps} activeListId={activeListId} />
        ) : page === 'focus' ? (
          <PomodoroPage
            tasks={focusPool}
            selectedTaskId={pomoTarget?.id ?? null}
            onSelectTask={(id) => setPomoTarget(db.tasks.find((t) => t.id === id) ?? null)}
            pomo={pomo}
            onStart={startPomo}
            onToggle={togglePomo}
            onAbandon={() => { setPomo(null); setPomoTarget(null) }}
            onComplete={completePomo}
            todaySessions={todaySessions}
            titleOf={(id) => db.tasks.find((t) => t.id === id)?.title ?? '未知任务'}
          />
        ) : page === 'calendar' ? (
          <Calendar
            tasks={db.tasks}
            tags={db.tags}
            onToggleTask={(id, done) => updateTask(id, { done })}
            onAddTask={(title, date) => addTask(title, date, null)}
          />
        ) : page === 'habits' ? (
          <Habits
            habits={db.habits}
            habitRecords={db.habitRecords}
            onAddHabit={addHabit}
            onUpdateHabit={updateHabit}
            onDeleteHabit={deleteHabit}
            onToggleCheck={toggleHabitCheck}
          />
        ) : page === 'stats' ? (
          <Stats focusSessions={db.focusSessions} sleepRecords={db.sleepRecords} tasks={db.tasks} tags={db.tags} />
        ) : page === 'important' ? (
          <ImportantDays
            importantDays={db.importantDays}
            periodRecords={db.periodRecords}
            onAddDay={addImportantDay}
            onUpdateDay={updateImportantDay}
            onDeleteDay={deleteImportantDay}
            onPeriodMark={markPeriod}
            onDeletePeriod={deletePeriod}
          />
        ) : (
          <Placeholder label={PLACEHOLDER_PAGE[page] ?? ''} />
        )}
      </main>

      {/* ===== 右栏：任务详情 ===== */}
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

          {/* 子任务（每条可单独开番茄钟，问题2） */}
          <div className="mt-5">
            <div className="flex justify-between text-xs font-medium text-neutral-500 mb-1.5">
              <span>子任务</span>
              {selectedChildren.length > 0 && (
                <span>{selectedChildren.filter((c) => c.done).length}/{selectedChildren.length}</span>
              )}
            </div>
            {selectedChildren.map((c) => (
              <div key={c.id} className="group flex items-center gap-2.5 py-1.5">
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={(e) => updateTask(c.id, { done: e.target.checked })}
                  className="accent-haruto-sea w-3.5 h-3.5 shrink-0"
                />
                <span className={`flex-1 text-sm truncate ${c.done ? 'line-through text-neutral-400' : ''}`}>{c.title}</span>
                <button
                  onClick={() => setPomoTarget(c)}
                  className="text-xs opacity-40 hover:opacity-100 transition-opacity shrink-0"
                  title="子任务单独专注"
                >
                  🍅
                </button>
              </div>
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

      {/* 番茄钟浮动条 */}
      {(pomoTarget || pomo) && (
        <PomodoroBar
          task={pomoTarget}
          state={pomo}
          onStart={(minutes, mode) => startPomo(minutes, mode)}
          onToggle={togglePomo}
          onAbandon={() => { setPomo(null); setPomoTarget(null) }}
          onComplete={completePomo}
        />
      )}
    </div>
  )
}
