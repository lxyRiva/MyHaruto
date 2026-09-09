// 看板任务卡片（RF-P2a 自 BoardView.tsx 迁入；RF-Fix3c 第6项薄壳化）：
// 视图差异留本壳——左键 = 悬空详情弹窗（activePopupId 全局互斥）、右键菜单/日期/子任务输入/删除确认接线；
// 卡片本体（勾选框+标题+meta 行+子任务折叠递归）全部委托 TaskCardBase（吃 taskMeta/taskTree）；
// 弹窗内容与右栏同渲染（TaskDetailContent，第7项功能等价化）
import { useEffect, useRef, useState } from 'react'
import type { Task } from '../../../shared/types'
import FloatingMenu from '../../../shared/components/FloatingMenu'
import { DatePickerModal } from './DateTimePickers'
import { todayStr } from '../../../shared/utils/date'
import { buildTaskContextMenu, type CardBundle } from './taskMenu'
import { pinnedGroupFirst } from '../utils/taskSort'
import TaskCardBase from './TaskCardBase'
import TaskDeleteConfirmModal from './TaskDeleteConfirmModal'
import TaskDetailContent from './TaskDetailContent'

/* ---------- 任务卡片薄壳：TaskCardBase 本体 + 悬空弹窗 + 右键菜单 + 行内输入 ---------- */
export default function TaskCard({
  task,
  columnTasks,
  foldedIds,
  parentFolded,
  depth,
  seen,
  minutesOf,
  allTasks,
  aiName,
  tags,
  subTags,
  sections,
  activePopupId,
  onRequestPopup,
  onClosePopup,
  onToggleDone,
  onToggleChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onSetTaskReminder,
  onUpdateTaskDue,
  onUpdateTask,
  onAddSubtask,
  onUpdateTag,
  onUpdateTaskSection,
  onTogglePinned,
  onSetPriority,
  onSetMasterTask,
  onPomodoro,
  onDeleteTaskTree,
  onOpenSubTag,
}: { task: Task; columnTasks: Task[]; foldedIds: Set<string>; parentFolded: boolean; depth: number; seen: Set<string> } & CardBundle) {
  const cardRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pop, setPop] = useState<{ x: number; y: number } | null>(null) // 本卡弹窗坐标（每次打开按自身 rect 现场算）
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [subInput, setSubInput] = useState(false)
  const [pickingDate, setPickingDate] = useState(false) // 行内日期选择（菜单"选择日期…"）
  const [confirmDelete, setConfirmDelete] = useState(false) // 修正2：删除任务确认
  const [dateOpen, setDateOpen] = useState(false) // 弹窗日期行 → 日期选择 modal
  const popOpen = activePopupId === task.id && !!pop
  const today = todayStr()

  /* 子任务：本列内 parentTaskId 指向本卡的任务（seen 防环）；折叠时只显示第一个 */
  // 子任务跟随父卡所在分区（RF-Fix1 修正）：父卡在折叠区 → 子孙跟随显示（可展开查看）；
  // 父卡在堆叠区 → 排除已折叠任务（其已在折叠区显示，不在堆叠区父卡下重复）
  const children = pinnedGroupFirst(
    columnTasks.filter((t) => t.parentTaskId === task.id && !seen.has(t.id) && (parentFolded || !foldedIds.has(t.id)))
  )
  const childSeen = (id: string) => new Set([...seen, id])

  /* Bug1 修复：弹窗坐标基于本卡 rect 现场计算；显示由全局 activePopupId 互斥（开新关旧） */
  /* RF-Fix3c Bug5：弹窗与右键菜单显式互斥（双向）——
     开弹窗先关菜单：否则菜单滞留（两套外关互不感知，见下）；
     开菜单先关弹窗：右键落在弹窗内时 mousedown 被 contains 放行、弹窗不关，
     若不同步关闭则「弹窗+菜单」并存，后续任意关闭路径都可能让另一方滞留 */
  const openPopup = () => {
    setMenu(null)
    const r = cardRef.current?.getBoundingClientRect()
    if (!r) return
    const W = 380
    const H = 320
    let x = r.right + 8
    if (x + W > window.innerWidth - 8) x = Math.max(8, r.left - W - 8)
    const y = Math.max(8, Math.min(r.top - 4, window.innerHeight - H - 8))
    setPop({ x, y })
    onRequestPopup(task.id) // BoardView 全局只保留一个
  }

  useEffect(() => {
    if (!popOpen) return
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClosePopup()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClosePopup()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [popOpen, onClosePopup])

  /* 右键九项菜单（构建器已提取导出，列表视图卡片复用） */
  const menuEntries = buildTaskContextMenu(task, {
    allTasks,
    tags,
    subTags,
    sections,
    onRequestAddSubtask: () => setSubInput(true),
    onSetPriority,
    onSetMasterTask,
    onTogglePinned,
    onUpdateTask,
    onUpdateTag,
    onUpdateTaskSection,
    onSetDueDate: onUpdateTaskDue,
    onPickDate: () => setPickingDate(true),
    onPomodoro,
    onDeleteRequest: () => setConfirmDelete(true),
  })

  return (
    <div
      ref={cardRef}
      onClick={openPopup}
      onContextMenu={(e) => {
        e.preventDefault()
        if (popOpen) onClosePopup() // Bug5：开菜单同步关弹窗（互斥另一半）
        setMenu({ x: e.clientX, y: e.clientY })
      }}
      title={task.title}
      className="cursor-pointer rounded-lg border border-neutral-200/80 bg-white px-2.5 py-2 transition-all
        hover:border-haruto-sea/50 hover:shadow-sm select-none dark:border-neutral-700/70 dark:bg-neutral-900"
    >
      <TaskCardBase
        task={task}
        metaDeps={{ minutesOf, tagMap: new Map(tags.map((t) => [t.id, t])) }}
        childrenTasks={children}
        onToggleDone={onToggleDone}
        onEditDate={() => setDateOpen(true)}
        variant="board"
        renderChild={(c) => (
          <TaskCard
            key={c.id}
            task={c}
            columnTasks={columnTasks}
            foldedIds={foldedIds}
            parentFolded={parentFolded}
            depth={depth + 1}
            seen={childSeen(c.id)}
            {...{
              minutesOf, allTasks, aiName, tags, subTags, sections, activePopupId, onRequestPopup, onClosePopup,
              onToggleDone, onToggleChecklist, onAddChecklistItem, onUpdateChecklistItem, onDeleteChecklistItem,
              onSetTaskReminder, onUpdateTaskDue, onUpdateTask, onAddSubtask, onUpdateTag, onUpdateTaskSection,
              onTogglePinned, onSetPriority, onSetMasterTask, onPomodoro, onDeleteTaskTree, onOpenSubTag,
            }}
          />
        )}
      />

      {/* 行内添加子任务（右键菜单触发，回车创建、Esc 取消） */}
      {subInput && (
        <input
          autoFocus
          placeholder="子任务标题，回车保存"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              onAddSubtask(task.id, e.currentTarget.value.trim())
              e.currentTarget.value = ''
              setSubInput(false)
            }
            if (e.key === 'Escape') setSubInput(false)
          }}
          className="mt-2 w-full rounded-lg border border-dashed border-haruto-sea/50 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-haruto-sea"
        />
      )}

      {/* 行内日期选择（菜单"选择日期…"触发，选完即存） */}
      {pickingDate && (
        <input
          autoFocus
          type="date"
          defaultValue={task.dueDate ?? ''}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            onUpdateTaskDue(task.id, e.target.value || null)
            setPickingDate(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setPickingDate(false)
          }}
          onBlur={() => setPickingDate(false)}
          className="mt-2 w-full rounded-lg border border-haruto-sea/50 bg-transparent px-2 py-1 text-xs outline-none"
        />
      )}

      {/* 左键悬空详情弹窗（Fix3c 第7项：内容与右栏同渲染 TaskDetailContent；宽度/滚动约束在本壳） */}
      {popOpen && pop && (
        <div
          ref={popRef}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-40 flex max-h-[70vh] w-[360px] max-w-[480px] flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-xl
            animate-[fadeSlideIn_.12s_ease] dark:border-neutral-700 dark:bg-neutral-800"
          style={{ left: pop.x, top: pop.y }}
        >
          <TaskDetailContent
            task={task}
            aiName={aiName}
            tags={tags}
            subTags={subTags}
            sections={sections}
            childTasks={children}
            onOpenSubTag={onOpenSubTag}
            onUpdateTask={onUpdateTask}
            onToggleDone={onToggleDone}
            onAddSubtask={onAddSubtask}
            onToggleChecklist={onToggleChecklist}
            onAddChecklistItem={onAddChecklistItem}
            onUpdateChecklistItem={onUpdateChecklistItem}
            onDeleteChecklistItem={onDeleteChecklistItem}
            onEditDate={() => setDateOpen(true)}
          />
        </div>
      )}

      {/* 右键九项菜单 */}
      {menu && <FloatingMenu x={menu.x} y={menu.y} entries={menuEntries} onClose={() => setMenu(null)} />}

      {/* 日期选择 modal（弹窗日期行入口） */}
      {dateOpen && (
        <DatePickerModal
          initialDueDate={task.dueDate}
          initialRemindAt={task.remindAt ?? null}
          initialRemindDays={task.remindDaysBefore ?? null}
          onSave={(dueDate, remindAt, remindDaysBefore) => {
            onUpdateTaskDue(task.id, dueDate)
            onSetTaskReminder(task.id, remindAt, remindDaysBefore)
            setDateOpen(false)
          }}
          onCancel={() => setDateOpen(false)}
        />
      )}

      {/* 修正2：删除任务确认（删整树；共享 modal） */}
      {confirmDelete && (
        <TaskDeleteConfirmModal
          taskTitle={task.title}
          onConfirm={() => {
            onDeleteTaskTree(task.id)
            setConfirmDelete(false)
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
