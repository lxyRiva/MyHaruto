// L3 内容区：路由 switch + 右栏 A（任务详情面板）。RF-P3b 自 App 原样迁出
// （右栏宽度 detailWidth 拖拽为右栏私有布局态，随本组件迁出；页面数据与动作全部 props 下发，
//   动作签名一律从源 hook / 页面组件推导，避免手写漂移）
import { useRef, useState, type ComponentProps } from 'react'
import type { Db, Task } from '../../shared/types'
import Today from '../../features/tasks/pages/Today'
import Tasks from '../../features/tasks/pages/Tasks'
import Calendar from '../../features/calendar/pages/Calendar'
import Habits from '../../features/habits/pages/Habits'
import Stats from '../../features/stats/pages/Stats'
import ImportantDays from '../../features/important-days/pages/ImportantDays'
import PomodoroPage from '../../features/pomodoro/pages/PomodoroPage'
import Placeholder from './Placeholder'
import Recent7View from '../../features/tasks/components/Recent7View'
import BoardView from '../../features/tasks/components/BoardView'
import TaskDetailPanel from '../../features/tasks/components/TaskDetailPanel'
import TaskDeleteConfirmModal from '../../features/tasks/components/TaskDeleteConfirmModal'
import { useTaskActions } from '../../features/tasks/hooks/useTaskActions'
import { usePomodoro } from '../../features/pomodoro/hooks/usePomodoro'
import { useHabits } from '../../features/habits/hooks/useHabits'
import { useImportantDays } from '../../features/important-days/hooks/useImportantDays'
import type { PageKey } from '../../App'

const PLACEHOLDER_PAGE: Partial<Record<PageKey, string>> = {
  album: '书影清单', travel: '旅游札记', town: '小镇', // chat 占位文案动态用 aiName
}

type TaskActions = ReturnType<typeof useTaskActions>
type PomodoroActions = ReturnType<typeof usePomodoro>
type HabitActions = ReturnType<typeof useHabits>
type ImportantDayActions = ReturnType<typeof useImportantDays>

// App 的 listViewProps 实际包含 minutesOf（Tasks/Recent7View 需要；Today 内部自算不声明）
type ListViewProps = ComponentProps<typeof Today> & { minutesOf: (id: string) => number }

export default function MainArea({
  loaded, page, activeListId, activeSubTagId,
  db, aiName,
  selected, selectedChildren, setSelectedId,
  boardProps, listViewProps,
  updateTask, addTask, toggleTaskDone, deleteTaskTree, addSubtaskInline,
  toggleChecklistItem, addChecklistItem, updateChecklistItem, deleteChecklistItem,
  openH2,
  pomo, pomoTarget, setPomoTarget, startPomo, togglePomo, abandonPomo, completePomo,
  focusPool, todaySessions,
  addHabit, updateHabit, deleteHabit, toggleHabitCheck,
  addImportantDay, updateImportantDay, deleteImportantDay, markPeriod, deletePeriod, reopenPeriod,
}: {
  loaded: boolean
  page: PageKey
  activeListId: string
  activeSubTagId: string | null
  db: Db
  aiName: string
  selected: Task | null
  selectedChildren: Task[]
  setSelectedId: (id: string | null) => void
  listViewProps: ListViewProps
  boardProps: Omit<ComponentProps<typeof BoardView>, 'h1TagId' | 'activeSubTagId'>
  updateTask: TaskActions['updateTask']
  addTask: TaskActions['addTask']
  toggleTaskDone: TaskActions['toggleTaskDone']
  deleteTaskTree: TaskActions['deleteTaskTree']
  addSubtaskInline: TaskActions['addSubtaskInline']
  toggleChecklistItem: TaskActions['toggleChecklistItem']
  addChecklistItem: TaskActions['addChecklistItem']
  updateChecklistItem: TaskActions['updateChecklistItem']
  deleteChecklistItem: TaskActions['deleteChecklistItem']
  openH2: (subTagId: string) => void
  pomo: PomodoroActions['pomo']
  pomoTarget: Task | null
  setPomoTarget: PomodoroActions['setPomoTarget']
  startPomo: PomodoroActions['startPomo']
  togglePomo: PomodoroActions['togglePomo']
  abandonPomo: PomodoroActions['abandonPomo']
  completePomo: PomodoroActions['completePomo']
  focusPool: Task[]
  todaySessions: Db['focusSessions']
  addHabit: HabitActions['addHabit']
  updateHabit: HabitActions['updateHabit']
  deleteHabit: HabitActions['deleteHabit']
  toggleHabitCheck: HabitActions['toggleHabitCheck']
  addImportantDay: ImportantDayActions['addImportantDay']
  updateImportantDay: ImportantDayActions['updateImportantDay']
  deleteImportantDay: ImportantDayActions['deleteImportantDay']
  markPeriod: ImportantDayActions['markPeriod']
  deletePeriod: ImportantDayActions['deletePeriod']
  reopenPeriod: ImportantDayActions['reopenPeriod']
}) {
  // 修正1：右栏宽度可拖拽调整（localStorage 持久化，260-480px；右栏私有布局态随组件迁出）
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
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

  return (
    <>
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
          ) : activeListId !== 'all' && activeListId !== 'today' && db.tags.some((t) => t.id === activeListId) ? (
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
              onOpenSubTag={openH2}
              onUpdateTask={updateTask}
              onToggleDone={toggleTaskDone}
              onAddSubtask={addSubtaskInline}
              onPomodoro={(t) => setPomoTarget(t)}
              onDeleteRequest={() => setConfirmDeleteId(selected.id)}
              onToggleChecklist={toggleChecklistItem}
              onAddChecklistItem={addChecklistItem}
              onUpdateChecklistItem={updateChecklistItem}
              onDeleteChecklistItem={deleteChecklistItem}
            />
          </div>
        </aside>
      )}

      {/* 右栏删除确认（Fix3c-2 第9项：右栏删除改 deleteTaskTree+确认，与卡片右键同款 modal） */}
      {confirmDeleteId && (
        <TaskDeleteConfirmModal
          taskTitle={db.tasks.find((t) => t.id === confirmDeleteId)?.title ?? ''}
          onConfirm={() => {
            deleteTaskTree(confirmDeleteId)
            setSelectedId(null)
            setConfirmDeleteId(null)
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </>
  )
}
