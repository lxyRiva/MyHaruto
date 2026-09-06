// App = 三层结构：L1 图标导航栏 → L2 清单树（任务模块）→ L3 内容区 + 右侧详情
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Db, Task, Tag, SubTag } from './types'
import PomodoroBar from './components/PomodoroBar'
import FloatingMenu from './components/FloatingMenu'
import BoardView from './features/tasks/components/BoardView'
import { IconTasks, IconTimer, IconCalendar, IconCheck, IconChart, IconHeart, IconFilm, IconPlane, IconChat, IconTown, IconSun, IconMoon, IconClock, IconChevron, IconSettings } from './components/icons'
import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Habits from './pages/Habits'
import Stats from './pages/Stats'
import ImportantDays from './pages/ImportantDays'
import PomodoroPage from './pages/PomodoroPage'
import Placeholder from './pages/Placeholder'
import Recent7View from './components/Recent7View'
import TaskDetailPanel from './components/TaskDetailPanel'
import { useTaskActions } from './features/tasks/hooks/useTaskActions'
import { useTaskSelectors } from './features/tasks/hooks/useTaskSelectors'
import SubTagModal, { PALETTE, H2_PALETTE } from './features/tasks/components/SubTagModal'
import { usePomodoro } from './features/pomodoro/hooks/usePomodoro'
import { useHabits } from './features/habits/hooks/useHabits'
import { useImportantDays } from './features/important-days/hooks/useImportantDays'
import { DEFAULT_AI_NAME } from './shared/constants'

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
  { key: 'chat', icon: IconChat, label: 'AI 伙伴', soon: 'M5' }, // 悬浮标题动态显示 db.settings.aiName
  { key: 'town', icon: IconTown, label: '小镇', soon: 'V3' },
]

const PLACEHOLDER_PAGE: Partial<Record<PageKey, string>> = {
  album: '书影清单', travel: '旅游札记', town: '小镇', // chat 占位文案动态用 db.settings.aiName
}

export default function App() {
  const [db, setDb] = useState<Db>({ tasks: [], tags: [], subTags: [], sections: [], focusSessions: [], habits: [], habitRecords: [], importantDays: [], periodRecords: [], sleepRecords: [], settings: { theme: 'light', harutoMetDate: '', currentCharacterId: 'haruto', skinId: 'default', aiName: DEFAULT_AI_NAME } })
  const [loaded, setLoaded] = useState(false)
  const [page, setPage] = useState<PageKey>('today')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // L2 清单树选中项
  const [activeListId, setActiveListId] = useState<string>('all')
  // 新建清单表单
  const [addingList, setAddingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState(PALETTE[0])

  // ----- L2 两层树（H1清单 → H2标签） -----
  const [expandedH1s, setExpandedH1s] = useState<Set<string> | null>(null) // null = 默认全部展开
  const [activeSubTagId, setActiveSubTagId] = useState<string | null>(null) // 当前选中 H2，null = H1 总览/固定入口
  // H1 三点菜单 / H2 右键菜单 / H1 行内重命名 / H2 新建编辑 modal / 解散确认
  const [h1Menu, setH1Menu] = useState<{ tagId: string; x: number; y: number } | null>(null)
  const [subTagMenu, setSubTagMenu] = useState<{ subTagId: string; x: number; y: number } | null>(null)
  const [renamingH1, setRenamingH1] = useState<string | null>(null)
  const [subTagModal, setSubTagModal] = useState<{ mode: 'create' | 'edit'; h1TagId: string; subTag?: SubTag } | null>(null)
  const [dissolveConfirm, setDissolveConfirm] = useState<{ tagId: string } | null>(null)
  // 当前正在重命名的看板 Section（Step 4：左/右插入分组后立即进入重命名）
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null)

  // 设置弹窗（当前仅 AI 名字）
  const [showSettings, setShowSettings] = useState(false)
  const [aiNameDraft, setAiNameDraft] = useState('')

  // 修正1：右栏宽度可拖拽调整（localStorage 持久化，260-480px）
  const [detailWidth, setDetailWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem('mh-detail-panel-width'))
    return Number.isFinite(v) && v >= 260 && v <= 480 ? v : 320
  })
  const detailDragRef = useRef<{ startX: number; startW: number } | null>(null)
  const startDetailResize = (clientX: number) => {
    detailDragRef.current = { startX: clientX, startW: detailWidth }
    const onMove = (ev: MouseEvent) => {
      if (!detailDragRef.current) return
      const w = Math.max(260, Math.min(480, detailDragRef.current.startW - (ev.clientX - detailDragRef.current.startX)))
      setDetailWidth(w)
      localStorage.setItem('mh-detail-panel-width', String(w))
    }
    const onUp = () => {
      detailDragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // 修正3：L2 的 H1/H2 拖拽排序（置顶项固定最前不参与）
  const [l2Drag, setL2Drag] = useState<{ kind: 'h1' | 'h2'; id: string } | null>(null)
  const [l2Over, setL2Over] = useState<{ kind: 'h1' | 'h2'; id: string; pos: 'before' | 'after' } | null>(null)

  // ---------- 数据动作与派生（RF-P1 迁 features/，App 保留路由/L2 UI/布局状态） ----------
  const {
    addTask, addTaskWithOptions, addSubtask, updateTask, deleteTask, deleteTaskRecursive,
    updateTaskTag, updateTaskSection, toggleTaskDone, aggregateSectionDone, addSubtaskInline,
    togglePinnedToday, setMasterTask, setTaskPriority, setTaskReminder, updateTaskDue, addTaskToSection,
    toggleChecklistItem, addChecklistItem, updateChecklistItem, deleteChecklistItem,
    addTag, updateTag, dissolveH1,
    addSubTag, updateSubTag, deleteSubTag,
    addSection, insertSectionNextTo, updateSection, moveSection, deleteSection,
  } = useTaskActions(db, setDb)
  const {
    selected, selectedChildren, tagMap, todayStr,
    todaySessions, todayMinutes, mainTasks, specialTags, normalTags,
    countOf, minutesOf, focusPool,
  } = useTaskSelectors(db, selectedId)
  const { pomo, pomoTarget, setPomoTarget, startPomo, togglePomo, completePomo, abandonPomo } = usePomodoro(db, setDb)
  const { addHabit, updateHabit, deleteHabit, toggleHabitCheck } = useHabits(db, setDb)
  const { addImportantDay, updateImportantDay, deleteImportantDay, markPeriod, deletePeriod, reopenPeriod } = useImportantDays(db, setDb)
  const moveH1 = (dragId: string, targetId: string, pos: 'before' | 'after') =>
    setDb((d) => {
      const arr = [...d.tags]
      if (!arr.some((t) => t.id === dragId) || dragId === targetId) return d
      const from = arr.findIndex((t) => t.id === dragId)
      const [item] = arr.splice(from, 1)
      const toIdx = arr.findIndex((t) => t.id === targetId)
      arr.splice(pos === 'before' ? toIdx : toIdx + 1, 0, item)
      return { ...d, tags: arr }
    })
  const moveSubTag = (dragId: string, targetId: string, pos: 'before' | 'after') =>
    setDb((d) => {
      const drag = d.subTags.find((s) => s.id === dragId)
      const target = d.subTags.find((s) => s.id === targetId)
      if (!drag || !target || drag.h1TagId !== target.h1TagId || drag.isPinned || target.isPinned) return d
      const group = d.subTags.filter((s) => s.h1TagId === drag.h1TagId && !s.isPinned).sort((a, b) => a.order - b.order)
      const from = group.findIndex((s) => s.id === dragId)
      if (from < 0 || !group.some((s) => s.id === targetId) || dragId === targetId) return d
      const [item] = group.splice(from, 1)
      const toIdx = group.findIndex((s) => s.id === targetId)
      group.splice(pos === 'before' ? toIdx : toIdx + 1, 0, item)
      const orderMap = new Map(group.map((s, i) => [s.id, i]))
      return { ...d, subTags: d.subTags.map((s) => (orderMap.has(s.id) ? { ...s, order: orderMap.get(s.id)! } : s)) }
    })

  // 修正4：点击 H2 归属跳转该标签的看板视图
  const openSubTagBoard = (subTagId: string) => {
    const st = db.subTags.find((s) => s.id === subTagId)
    setActiveSubTagId(subTagId)
    setActiveListId(st?.h1TagId || 'all')
    setPage('tasks')
    setSelectedId(null)
  }

  useEffect(() => {
    window.myharuto.getDb().then((d) => {
      setDb(d)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (loaded) window.myharuto.saveDb(db)
  }, [db, loaded])

  // 【视觉签名】主题切换颜色过渡依赖 styles.css 的 * transition 规则，不要移除
  useEffect(() => {
    document.documentElement.classList.toggle('dark', db.settings.theme === 'dark')
  }, [db.settings.theme])

  const toggleTheme = () =>
    setDb((d) => ({ ...d, settings: { ...d.settings, theme: d.settings.theme === 'dark' ? 'light' : 'dark' } }))

  // 保存设置弹窗（写入后由 db useEffect 自动持久化；aiName 全局显示处实时生效）
  const saveSettings = () => {
    const v = aiNameDraft.trim()
    if (!v) return
    setDb((d) => ({ ...d, settings: { ...d.settings, aiName: v } }))
    setShowSettings(false)
  }

  // ---------- 任务 ----------


  const toggleH1Expand = (tagId: string) =>
    setExpandedH1s((prev) => {
      const cur = prev ?? new Set(db.tags.map((t) => t.id)) // 首次操作时物化"全展开"
      const next = new Set(cur)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })

  const selectSubTag = (subTagId: string) => {
    const st = db.subTags.find((s) => s.id === subTagId)
    setActiveSubTagId(subTagId)
    // 同步归属 H1：否则从最近7天进看板会被 L3 的 recent7 分支拦截（点击无反应），从今天进会泄漏旧右栏
    setActiveListId(st?.h1TagId || 'all')
    setSelectedId(null) // 看板无右栏，切入时自动收起
    setPage('tasks')
  }









  // ---------- 派生 ----------
  // AI 显示名兜底：旧库（主进程未重启自愈时）可能还没有 aiName 字段
  const aiName = db.settings.aiName || DEFAULT_AI_NAME

  // 看板共享 props（视图A/B 共用，Step 4 分组操作 + 新建任务）
  const boardProps = {
    subTags: db.subTags,
    sections: db.sections,
    tasks: db.tasks,
    onSetMasterTask: setMasterTask,
    focusSessions: db.focusSessions,
    tags: db.tags,
    renamingSectionId,
    onRequestRename: (id: string) => setRenamingSectionId(id),
    onRenameCommit: (id: string, name: string) => {
      if (name) updateSection(id, { name })
      setRenamingSectionId(null)
    },
    onRenameCancel: () => setRenamingSectionId(null),
    onAddTaskToSection: addTaskToSection,
    onInsertSection: (anchorId: string, side: 'left' | 'right') => setRenamingSectionId(insertSectionNextTo(anchorId, side)),
    onMoveSection: moveSection,
    onDeleteSection: deleteSection,
    onCreateSection: (subTagId: string) => setRenamingSectionId(addSection(subTagId, '未命名分组')),
    onAggregateDone: aggregateSectionDone,
    // Step 5 任务卡片交互
    aiName,
    onToggleDone: toggleTaskDone,
    onToggleChecklist: toggleChecklistItem,
    onAddChecklistItem: addChecklistItem,
    onUpdateChecklistItem: updateChecklistItem,
    onDeleteChecklistItem: deleteChecklistItem,
    onSetTaskReminder: setTaskReminder,
    onUpdateTaskDue: updateTaskDue,
    onAddSubtask: addSubtaskInline,
    onUpdateTag: updateTaskTag,
    onUpdateTaskSection: updateTaskSection,
    onTogglePinned: togglePinnedToday,
    onSetPriority: setTaskPriority,
    onPomodoro: (t: Task) => setPomoTarget(t),
    onDeleteTaskRecursive: deleteTaskRecursive,
    onOpenSubTag: openSubTagBoard,
  }

  // 今日/最近7天列表视图共享 props（Step 6）
  const listViewProps = {
    tasks: db.tasks,
    tags: db.tags,
    subTags: db.subTags,
    sections: db.sections,
    focusSessions: db.focusSessions,
    aiName,
    selectedId,
    onSelect: (id: string | null) => setSelectedId(id),
    minutesOf,
    onOpenSubTag: openSubTagBoard,
    onAddTaskWithOptions: addTaskWithOptions,
    onToggleDone: toggleTaskDone,
    onToggleChecklist: toggleChecklistItem,
    onAddChecklistItem: addChecklistItem,
    onUpdateChecklistItem: updateChecklistItem,
    onDeleteChecklistItem: deleteChecklistItem,
    onSetTaskReminder: setTaskReminder,
    onUpdateTaskDue: updateTaskDue,
    onAddSubtask: addSubtaskInline,
    onUpdateTag: updateTaskTag,
    onUpdateTaskSection: updateTaskSection,
    onTogglePinned: togglePinnedToday,
    onSetPriority: setTaskPriority,
    onSetMasterTask: setMasterTask,
    onPomodoro: (t: Task) => setPomoTarget(t),
    onDeleteTaskRecursive: deleteTaskRecursive,
    onUpdateTask: updateTask,
  }


  // L2 两层树渲染：H1 行（三角+色点+名称+计数+三点）/ H2 行（缩进22px+emoji+名称）
  const sortedSubTagsOf = (h1TagId: string) =>
    db.subTags
      .filter((s) => s.h1TagId === h1TagId)
      .sort((a, b) => (a.isPinned === b.isPinned ? a.order - b.order : a.isPinned ? -1 : 1))

  // H2 行（无左内边距：由外层缩进容器统一提供 28px + 竖线）；色点在行最右（修正6：H2 持有颜色标识，H1 不再显示色点）
  const renderSubTagRow = (st: SubTag) => {
    const dragOverH2 = l2Over?.kind === 'h2' && l2Over.id === st.id
    return (
    <button
      key={st.id}
      onDragOver={(e) => {
        if (!l2Drag || l2Drag.kind !== 'h2' || l2Drag.id === st.id || st.isPinned) return
        e.preventDefault()
        const r = e.currentTarget.getBoundingClientRect()
        setL2Over({ kind: 'h2', id: st.id, pos: e.clientY < r.top + r.height / 2 ? 'before' : 'after' })
      }}
      onDrop={(e) => {
        e.preventDefault()
        if (l2Drag && l2Over?.id === st.id) moveSubTag(l2Drag.id, st.id, l2Over.pos)
        setL2Drag(null)
        setL2Over(null)
      }}
      onClick={() => selectSubTag(st.id)}
      onContextMenu={(e) => {
        e.preventDefault()
        setSubTagMenu({ subTagId: st.id, x: e.clientX, y: e.clientY })
      }}
      className={`group/sub w-full flex items-center gap-1.5 pr-2 py-1.5 rounded-lg text-[13px] transition-[border-color]
        ${activeSubTagId === st.id && page === 'tasks'
          ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
          : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}
        ${dragOverH2 ? (l2Over!.pos === 'before' ? 'border-t-2 border-t-haruto-sea' : 'border-b-2 border-b-haruto-sea') : ''}
        ${l2Drag?.kind === 'h2' && l2Drag.id === st.id ? 'opacity-50' : ''}`}
    >
      {/* Bug2 修复：拖拽把手模式——只有把手 draggable，行内 click 不再被拖拽吞掉 */}
      {!st.isPinned && (
        <span
          draggable
          onDragStart={(e) => {
            setL2Drag({ kind: 'h2', id: st.id })
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragEnd={() => {
            setL2Drag(null)
            setL2Over(null)
          }}
          onClick={(e) => e.stopPropagation()}
          title="拖动排序"
          className="cursor-grab shrink-0 w-2 text-center text-neutral-300 opacity-0 group-hover/sub:opacity-100 transition-opacity select-none"
        >
          ⠿
        </span>
      )}
      {st.emoji && <span className="text-xs shrink-0">{st.emoji}</span>}
      <span className="truncate">{st.name}</span>
      <span className="ml-auto mr-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: st.color }} />
    </button>
    )
  }

  // H2 列表容器：缩进 28px（13px 外距 + 15px 内距），浅色竖线分隔视觉层级
  const subTagIndentCls =
    'ml-[13px] pl-[15px] border-l border-neutral-200/70 dark:border-neutral-700/60 space-y-0.5'

  const renderH1 = (t: Tag) => {
    const expanded = expandedH1s === null || expandedH1s.has(t.id)
    const isActive = activeListId === t.id && page === 'tasks' && !activeSubTagId
    const subs = sortedSubTagsOf(t.id)
    return (
      <div key={t.id}>
        {renamingH1 === t.id ? (
          <input
            autoFocus
            defaultValue={t.name}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => setRenamingH1(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                updateTag(t.id, { name: e.currentTarget.value.trim() })
                setRenamingH1(null)
              }
              if (e.key === 'Escape') setRenamingH1(null)
            }}
            className="w-full text-sm rounded-lg border border-haruto-sea
              bg-white dark:bg-neutral-900 px-2 py-1.5 outline-none"
          />
        ) : (
          <div
            onDragOver={(e) => {
              if (!l2Drag || l2Drag.kind !== 'h1' || l2Drag.id === t.id || t.isPinned) return
              e.preventDefault()
              const r = e.currentTarget.getBoundingClientRect()
              setL2Over({ kind: 'h1', id: t.id, pos: e.clientY < r.top + r.height / 2 ? 'before' : 'after' })
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (l2Drag && l2Over?.id === t.id) moveH1(l2Drag.id, t.id, l2Over.pos)
              setL2Drag(null)
              setL2Over(null)
            }}
            onClick={() => {
              toggleH1Expand(t.id)
              setActiveListId(t.id)
              setActiveSubTagId(null)
              setSelectedId(null) // 看板无右栏，切入时自动收起
              setPage('tasks')
            }}
            className={`group/h1 w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer select-none transition-[border-color]
              ${isActive
                ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}
              ${l2Over?.kind === 'h1' && l2Over.id === t.id ? (l2Over.pos === 'before' ? 'border-t-2 border-t-haruto-sea' : 'border-b-2 border-b-haruto-sea') : ''}
              ${l2Drag?.kind === 'h1' && l2Drag.id === t.id ? 'opacity-50' : ''}`}
          >
            {/* Bug2 修复：拖拽把手模式（置顶项无把手） */}
            {!t.isPinned && (
              <span
                draggable
                onDragStart={(e) => {
                  setL2Drag({ kind: 'h1', id: t.id })
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => {
                  setL2Drag(null)
                  setL2Over(null)
                }}
                onClick={(e) => e.stopPropagation()}
                title="拖动排序"
                className="cursor-grab shrink-0 text-neutral-300 opacity-0 group-hover/h1:opacity-100 hover:text-neutral-500 transition-opacity select-none"
              >
                ⠿
              </span>
            )}
            <span className="shrink-0 text-neutral-400"><IconChevron open={expanded} /></span>
            <span className="truncate flex-1">{t.name}</span>
            {/* H2 标签数量（无 H2 时不显示，避免无意义的 0） */}
            {subs.length > 0 && (
              <span className="text-[10px] text-neutral-400 tabular-nums">{subs.length}</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setH1Menu({ tagId: t.id, x: e.clientX, y: e.clientY })
              }}
              title="清单操作"
              className="px-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 leading-none"
            >
              ⋯
            </button>
          </div>
        )}
        {expanded && <div className={subTagIndentCls}>{subs.map(renderSubTagRow)}</div>}
      </div>
    )
  }

  // 置顶的 H1 排前面（组内其余保持原顺序）
  const byPinned = (a: Tag, b: Tag) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
  const ungroupedSubTags = sortedSubTagsOf('')

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
          onClick={() => { setAiNameDraft(aiName); setShowSettings(true) }}
          title="设置"
          className="w-10 h-10 grid place-items-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <IconSettings />
        </button>
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
            {/* 固定入口：今天 / 最近7天 / 全部 */}
            <button
              onClick={() => { setPage('today'); setActiveListId('today'); setActiveSubTagId(null) }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                ${page === 'today'
                  ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <IconSun />
              <span>今天</span>
              <span className="ml-auto text-[10px] text-neutral-400 tabular-nums">{countOf('today')}</span>
            </button>
            <button
              onClick={() => { setActiveListId('recent7'); setActiveSubTagId(null); setPage('tasks') }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                ${activeListId === 'recent7' && page === 'tasks' && !activeSubTagId
                  ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <IconClock />
              <span>最近7天</span>
            </button>
            <button
              onClick={() => { setActiveListId('all'); setActiveSubTagId(null); setPage('tasks') }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                ${activeListId === 'all' && page === 'tasks' && !activeSubTagId
                  ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <IconTasks />
              <span>全部</span>
              <span className="ml-auto text-[10px] text-neutral-400 tabular-nums">{countOf('all')}</span>
            </button>
            {specialTags.length > 0 && (
              <div className="pt-2 pb-0.5 px-3 text-[10px] font-medium text-neutral-400 tracking-wide">我的愿景</div>
            )}
            {[...specialTags].sort(byPinned).map(renderH1)}
            <div className="pt-2 pb-0.5 px-3 text-[10px] font-medium text-neutral-400 tracking-wide">清单</div>
            {[...normalTags].sort(byPinned).map(renderH1)}
            {ungroupedSubTags.length > 0 && (
              <>
                <div className="pt-2 pb-0.5 px-3 text-[10px] font-medium text-neutral-400 tracking-wide">未分组</div>
                <div className={subTagIndentCls}>{ungroupedSubTags.map(renderSubTagRow)}</div>
              </>
            )}
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
          <Today {...listViewProps} />
        ) : page === 'tasks' ? (
          activeListId === 'recent7' ? (
            <Recent7View {...listViewProps} />
          ) : activeSubTagId ? (
            // 视图B：H2 单标签看板（无右栏）
            <BoardView
              {...boardProps}
              h1TagId={db.subTags.find((s) => s.id === activeSubTagId)?.h1TagId ?? null}
              activeSubTagId={activeSubTagId}
            />
          ) : activeListId !== 'all' && activeListId !== 'today' && tagMap.has(activeListId) ? (
            // 视图A：H1 总览看板（该 H1 下所有 H2 平铺，无右栏）；'all'/'today' 保留原任务列表
            <BoardView {...boardProps} h1TagId={activeListId} activeSubTagId={null} />
          ) : (
            <Tasks {...listViewProps} activeListId={activeListId} />
          )
        ) : page === 'focus' ? (
          <PomodoroPage
            tasks={focusPool}
            selectedTaskId={pomoTarget?.id ?? null}
            onSelectTask={(id) => setPomoTarget(db.tasks.find((t) => t.id === id) ?? null)}
            pomo={pomo}
            onStart={startPomo}
            onToggle={togglePomo}
            onAbandon={abandonPomo}
            onComplete={completePomo}
            todaySessions={todaySessions}
            titleOf={(id) => db.tasks.find((t) => t.id === id)?.title ?? '未知任务'}
          />
        ) : page === 'calendar' ? (
          <Calendar
            tasks={db.tasks}
            tags={db.tags}
            subTags={db.subTags}
            sections={db.sections}
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
            aiName={aiName}
            onAddDay={addImportantDay}
            onUpdateDay={updateImportantDay}
            onDeleteDay={deleteImportantDay}
            onPeriodMark={markPeriod}
            onDeletePeriod={deletePeriod}
            onPeriodReopen={reopenPeriod}
          />
        ) : (
          <Placeholder label={page === 'chat' ? `${aiName} 聊天` : PLACEHOLDER_PAGE[page] ?? ''} />
        )}
      </main>

      {/* ===== 右栏 A：任务详情面板（今日 / 最近7天 / 全部·今天列表统一右栏，RF-P2b；看板视图选中即收起不渲染） ===== */}
      {selected && (page === 'today' || page === 'tasks') && (
        <div
          onMouseDown={(e) => startDetailResize(e.clientX)}
          title="拖动调整宽度"
          className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-haruto-sea/30"
        />
      )}
      {selected && (page === 'today' || page === 'tasks') && (
        <aside
          style={{ width: detailWidth }}
          className="shrink-0 overflow-hidden border-l border-neutral-200 p-5 dark:border-neutral-800"
        >
          <div className="flex h-full flex-col">
            <button
              onClick={() => setSelectedId(null)}
              className="mb-1 self-end text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              title="收起"
            >
              ×
            </button>
            <TaskDetailPanel
              task={selected}
              aiName={aiName}
              tags={db.tags}
              subTags={db.subTags}
              sections={db.sections}
              childTasks={selectedChildren}
              onOpenSubTag={openSubTagBoard}
              onUpdateTask={updateTask}
              onToggleDone={toggleTaskDone}
              onAddSubtask={addSubtaskInline}
              onPomodoro={(t) => setPomoTarget(t)}
              onDeleteTask={(id) => { deleteTask(id); setSelectedId(null) }}
              onToggleChecklist={toggleChecklistItem}
              onAddChecklistItem={addChecklistItem}
              onUpdateChecklistItem={updateChecklistItem}
              onDeleteChecklistItem={deleteChecklistItem}
            />
          </div>
        </aside>
      )}

      {/* ===== L2 菜单与弹窗 ===== */}
      {h1Menu && (() => {
        const t = db.tags.find((x) => x.id === h1Menu.tagId)
        if (!t) return null
        return (
          <FloatingMenu
            x={h1Menu.x}
            y={h1Menu.y}
            onClose={() => setH1Menu(null)}
            entries={[
              { label: '重命名', onClick: () => setRenamingH1(t.id) },
              { label: '新建标签', onClick: () => setSubTagModal({ mode: 'create', h1TagId: t.id }) },
              { label: t.isPinned ? '取消置顶' : '置顶', onClick: () => updateTag(t.id, { isPinned: !t.isPinned }) },
              { label: '解散', danger: true, onClick: () => setDissolveConfirm({ tagId: t.id }) },
            ]}
          />
        )
      })()}

      {subTagMenu && (() => {
        const st = db.subTags.find((x) => x.id === subTagMenu.subTagId)
        if (!st) return null
        return (
          <FloatingMenu
            x={subTagMenu.x}
            y={subTagMenu.y}
            onClose={() => setSubTagMenu(null)}
            entries={[
              { label: '编辑', onClick: () => setSubTagModal({ mode: 'edit', h1TagId: st.h1TagId, subTag: st }) },
              { label: st.isPinned ? '取消置顶' : '置顶', onClick: () => updateSubTag(st.id, { isPinned: !st.isPinned }) },
              { label: st.sharedWithAI ? '取消共享给AI' : '共享给AI', onClick: () => updateSubTag(st.id, { sharedWithAI: !st.sharedWithAI }) },
              { label: '删除', danger: true, onClick: () => deleteSubTag(st.id) },
            ]}
          />
        )
      })()}

      {subTagModal && (
        <SubTagModal
          title={subTagModal.mode === 'edit' ? '编辑标签' : '新建标签'}
          initial={
            subTagModal.mode === 'edit' && subTagModal.subTag
              ? { emoji: subTagModal.subTag.emoji, name: subTagModal.subTag.name, color: subTagModal.subTag.color }
              : { emoji: '', name: '', color: H2_PALETTE[0] }
          }
          onCancel={() => setSubTagModal(null)}
          onSave={(v) => {
            if (subTagModal.mode === 'create') addSubTag(subTagModal.h1TagId, v.name, v.emoji, v.color)
            else if (subTagModal.subTag) updateSubTag(subTagModal.subTag.id, v)
            setSubTagModal(null)
          }}
        />
      )}

      {dissolveConfirm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/30"
          onMouseDown={(e) => e.target === e.currentTarget && setDissolveConfirm(null)}
        >
          <div className="w-72 rounded-xl bg-white dark:bg-neutral-800 shadow-xl border border-neutral-200 dark:border-neutral-700 p-5 animate-[fadeSlideIn_.15s_ease]">
            <div className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">
              解散后该清单下的标签将变为未分组，确定解散？
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDissolveConfirm(null)}
                className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300"
              >
                取消
              </button>
              <button
                onClick={() => {
                  dissolveH1(dissolveConfirm.tagId)
                  if (activeListId === dissolveConfirm.tagId) setActiveListId('all')
                  setDissolveConfirm(null)
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white"
              >
                确认解散
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 设置弹窗（AI 名字等） ===== */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/30"
          onMouseDown={(e) => e.target === e.currentTarget && setShowSettings(false)}
        >
          <div className="w-80 rounded-xl bg-white dark:bg-neutral-800 shadow-xl border border-neutral-200 dark:border-neutral-700 p-5 animate-[fadeSlideIn_.15s_ease]">
            <div className="text-sm font-semibold mb-4">设置</div>
            <div className="text-xs text-neutral-500 mb-1.5">AI 名字</div>
            <input
              autoFocus
              value={aiNameDraft}
              onChange={(e) => setAiNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveSettings()
                if (e.key === 'Escape') setShowSettings(false)
              }}
              placeholder="AI 角色显示名"
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700
                bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-haruto-sea"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300"
              >
                取消
              </button>
              <button
                onClick={saveSettings}
                disabled={!aiNameDraft.trim()}
                className="text-xs px-3 py-1.5 rounded-lg bg-haruto-sea text-white disabled:opacity-40 disabled:cursor-default"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 番茄钟浮动条 */}
      {(pomoTarget || pomo) && (
        <PomodoroBar
          task={pomoTarget}
          state={pomo}
          onStart={(minutes, mode) => startPomo(minutes, mode)}
          onToggle={togglePomo}
          onAbandon={abandonPomo}
          onComplete={completePomo}
        />
      )}
    </div>
  )
}
