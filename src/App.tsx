// App = 路由编排 + 全局数据（db/hooks/useEffect）+ 布局组件组合（RF-P3b 后：
// L1/L2 侧栏、L3 内容区+右栏、设置弹窗均已抽至 app/layout/，本文件不再承载视图 JSX）
import { useEffect, useState } from 'react'
import type { Db, Task } from './shared/types'
import PomodoroBar from './features/pomodoro/components/PomodoroBar'
import L1Sidebar from './app/layout/L1Sidebar'
import L2Sidebar from './app/layout/L2Sidebar'
import MainArea from './app/layout/MainArea'
import SettingsModal from './app/layout/SettingsModal'
import { useTaskActions } from './features/tasks/hooks/useTaskActions'
import { useTaskSelectors } from './features/tasks/hooks/useTaskSelectors'
import { usePomodoro } from './features/pomodoro/hooks/usePomodoro'
import { useHabits } from './features/habits/hooks/useHabits'
import { useImportantDays } from './features/important-days/hooks/useImportantDays'
import { DEFAULT_AI_NAME } from './shared/constants'

export type PageKey =
  | 'today' | 'tasks' | 'calendar' | 'habits' | 'stats' | 'focus'
  | 'important' | 'album' | 'travel' | 'chat' | 'town'

export default function App() {
  const [db, setDb] = useState<Db>({ tasks: [], tags: [], subTags: [], sections: [], focusSessions: [], habits: [], habitRecords: [], importantDays: [], periodRecords: [], sleepRecords: [], settings: { theme: 'light', harutoMetDate: '', currentCharacterId: 'haruto', skinId: 'default', aiName: DEFAULT_AI_NAME } })
  const [loaded, setLoaded] = useState(false)
  const [page, setPage] = useState<PageKey>('today')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // L2 清单树选中项
  const [activeListId, setActiveListId] = useState<string>('all')
  // 当前选中 H2，null = H1 总览/固定入口
  const [activeSubTagId, setActiveSubTagId] = useState<string | null>(null)
  // 当前正在重命名的看板 Section（Step 4：左/右插入分组后立即进入重命名）
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null)
  // 设置弹窗（当前仅 AI 名字）——受控开关留 App，草稿态在 SettingsModal 内（每次打开重新挂载即重置）
  const [showSettings, setShowSettings] = useState(false)

  // ---------- 数据动作与派生（RF-P1 迁 features/，App 保留路由编排与全局状态） ----------
  const {
    addTask, addTaskWithOptions, updateTask, deleteTaskTree,
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

  // ---------- 路由 nav API（Bug2 教训：四件套 page/activeListId/activeSubTagId/selectedId
  //            必须在同一个函数内成套同步，禁止散点改） ----------
  const openToday = () => {
    setPage('today')
    setActiveListId('today')
    setActiveSubTagId(null)
  }
  const openRecent7 = () => {
    setActiveListId('recent7')
    setActiveSubTagId(null)
    setPage('tasks')
  }
  const openAll = () => {
    setActiveListId('all')
    setActiveSubTagId(null)
    setPage('tasks')
  }
  const openH1 = (tagId: string) => {
    setActiveListId(tagId)
    setActiveSubTagId(null)
    setSelectedId(null) // 看板无右栏，切入时自动收起
    setPage('tasks')
  }
  // 修正4：点击 H2 归属跳转该标签的看板视图（原 openSubTagBoard，四件套成套同步）
  const openH2 = (subTagId: string) => {
    const st = db.subTags.find((s) => s.id === subTagId)
    setActiveSubTagId(subTagId)
    // 同步归属 H1：否则从最近7天进看板会被 L3 的 recent7 分支拦截（点击无反应），从今天进会泄漏旧右栏
    setActiveListId(st?.h1TagId || 'all')
    setSelectedId(null)
    setPage('tasks')
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
    onUpdateTask: updateTask,
    onAddSubtask: addSubtaskInline,
    onUpdateTag: updateTaskTag,
    onUpdateTaskSection: updateTaskSection,
    onTogglePinned: togglePinnedToday,
    onSetPriority: setTaskPriority,
    onPomodoro: (t: Task) => setPomoTarget(t),
    onDeleteTaskTree: deleteTaskTree,
    onOpenSubTag: openH2,
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
    onOpenSubTag: openH2,
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
    onDeleteTaskTree: deleteTaskTree,
    onUpdateTask: updateTask,
  }

  return (
    <div className="flex h-full">
      {/* ===== L1：图标导航栏 ===== */}
      <L1Sidebar
        page={page}
        aiName={aiName}
        theme={db.settings.theme}
        onNav={setPage}
        onOpenSettings={() => setShowSettings(true)}
        onToggleTheme={toggleTheme}
      />

      {/* ===== L2：清单树（任务模块+今天页共用） ===== */}
      {(page === 'tasks' || page === 'today') && (
        <L2Sidebar
          page={page}
          activeListId={activeListId}
          activeSubTagId={activeSubTagId}
          specialTags={specialTags}
          normalTags={normalTags}
          tags={db.tags}
          subTags={db.subTags}
          countOf={countOf}
          todayMinutes={todayMinutes}
          todaySessions={todaySessions}
          openToday={openToday}
          openRecent7={openRecent7}
          openAll={openAll}
          openH1={openH1}
          openH2={openH2}
          moveH1={moveH1}
          moveSubTag={moveSubTag}
          updateTag={updateTag}
          addTag={addTag}
          onDissolve={(tagId) => {
            dissolveH1(tagId)
            if (activeListId === tagId) setActiveListId('all')
          }}
          addSubTag={addSubTag}
          updateSubTag={updateSubTag}
          deleteSubTag={deleteSubTag}
        />
      )}

      {/* ===== L3：内容区 + 右栏 A ===== */}
      <MainArea
        loaded={loaded}
        page={page}
        activeListId={activeListId}
        activeSubTagId={activeSubTagId}
        db={db}
        aiName={aiName}
        selected={selected}
        selectedChildren={selectedChildren}
        setSelectedId={setSelectedId}
        boardProps={boardProps}
        listViewProps={listViewProps}
        updateTask={updateTask}
        addTask={addTask}
        toggleTaskDone={toggleTaskDone}
        deleteTaskTree={deleteTaskTree}
        addSubtaskInline={addSubtaskInline}
        toggleChecklistItem={toggleChecklistItem}
        addChecklistItem={addChecklistItem}
        updateChecklistItem={updateChecklistItem}
        deleteChecklistItem={deleteChecklistItem}
        openH2={openH2}
        pomo={pomo}
        pomoTarget={pomoTarget}
        setPomoTarget={setPomoTarget}
        startPomo={startPomo}
        togglePomo={togglePomo}
        abandonPomo={abandonPomo}
        completePomo={completePomo}
        focusPool={focusPool}
        todaySessions={todaySessions}
        addHabit={addHabit}
        updateHabit={updateHabit}
        deleteHabit={deleteHabit}
        toggleHabitCheck={toggleHabitCheck}
        addImportantDay={addImportantDay}
        updateImportantDay={updateImportantDay}
        deleteImportantDay={deleteImportantDay}
        markPeriod={markPeriod}
        deletePeriod={deletePeriod}
        reopenPeriod={reopenPeriod}
      />

      {/* ===== 设置弹窗（受控开关留 App；条件渲染 = 每次打开重新挂载、草稿重置） ===== */}
      {showSettings && (
        <SettingsModal
          open
          onClose={() => setShowSettings(false)}
          aiName={aiName}
          onSave={(v) => setDb((d) => ({ ...d, settings: { ...d.settings, aiName: v } }))}
        />
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
