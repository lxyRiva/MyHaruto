// 列表任务卡片（今日/最近7天/全部页横板，RF-Fix3c 第6项薄壳化）：
// 视图差异留本壳——左键 = 右栏选中（onSelect）、选中态边框、右键菜单/日期/子任务输入/删除确认接线；
// 卡片本体（勾选框+标题+meta 行+子任务折叠递归）全部委托 TaskCardBase（吃 taskMeta/taskTree）
import { useState } from 'react'
import type { ChecklistItem, Section, SubTag, Tag, Task } from '../../../shared/types'
import FloatingMenu from '../../../shared/components/FloatingMenu'
import { buildTaskContextMenu } from './taskMenu'
import { DatePickerModal } from './DateTimePickers'
import TaskCardBase from './TaskCardBase'
import TaskDeleteConfirmModal from './TaskDeleteConfirmModal'
import type { Priority } from '../types'

export interface ListCardCallbacks {
  aiName: string
  tags: Tag[]
  subTags: SubTag[]
  sections: Section[]
  onToggleDone: (id: string) => void
  onToggleChecklist: (taskId: string, itemId: string) => void
  onAddChecklistItem: (taskId: string, text: string) => void
  onUpdateChecklistItem: (taskId: string, itemId: string, patch: Partial<ChecklistItem>) => void
  onDeleteChecklistItem: (taskId: string, itemId: string) => void
  onSetTaskReminder: (id: string, remindAt: string | null, remindDaysBefore: number | null) => void
  onUpdateTaskDue: (id: string, dueDate: string | null) => void
  onAddSubtask: (parentId: string, title: string) => void
  onUpdateTag: (id: string, tagId: string | null) => void
  onUpdateTaskSection: (id: string, sectionId: string | null) => void
  onTogglePinned: (id: string) => void
  onSetPriority: (id: string, p: Priority) => void
  onSetMasterTask: (id: string, masterId: string | null) => void
  onPomodoro: (t: Task) => void
  onDeleteTaskTree: (id: string) => void
  onOpenSubTag: (subTagId: string) => void // 修正4：点击 H2 归属跳转看板
}

export default function ListTaskCard({
  task,
  allTasks,
  depth,
  seen,
  selected,
  onSelect,
  minutesOf,
  aiName,
  tags,
  subTags,
  sections,
  onToggleDone,
  onToggleChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onSetTaskReminder,
  onUpdateTaskDue,
  onAddSubtask,
  onUpdateTag,
  onUpdateTaskSection,
  onTogglePinned,
  onSetPriority,
  onSetMasterTask,
  onPomodoro,
  onDeleteTaskTree,
  onOpenSubTag,
}: {
  task: Task
  allTasks: Task[] // 全量任务（子任务嵌套查找用）
  depth: number
  seen: Set<string>
  selected: boolean
  onSelect: () => void
  minutesOf: (id: string) => number
} & ListCardCallbacks) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [subInput, setSubInput] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [pickingDate, setPickingDate] = useState(false)

  // 子任务：全量任务内 parentTaskId 指向本卡的任务（seen 累积防环）
  const children = allTasks.filter((t) => t.parentTaskId === task.id && !seen.has(t.id))
  const childSeen = (id: string) => new Set([...seen, id])

  const base = (
    <TaskCardBase
      task={task}
      metaDeps={{ minutesOf, tagMap: new Map(tags.map((t) => [t.id, t])), sections, subTags }}
      childrenTasks={children}
      onToggleDone={onToggleDone}
      onOpenSubTag={onOpenSubTag}
      onEditDate={() => setDateOpen(true)}
      variant="list"
      showFirstLine
      renderChild={(c) => (
        <ListTaskCard
          key={c.id}
          task={c}
          allTasks={allTasks}
          depth={depth + 1}
          seen={childSeen(c.id)}
          selected={selected}
          onSelect={onSelect}
          minutesOf={minutesOf}
          {...{
            aiName, tags, subTags, sections, onToggleDone, onToggleChecklist, onAddChecklistItem,
            onUpdateChecklistItem, onDeleteChecklistItem, onSetTaskReminder, onUpdateTaskDue, onAddSubtask,
            onUpdateTag, onUpdateTaskSection, onTogglePinned, onSetPriority, onSetMasterTask, onPomodoro,
            onDeleteTaskTree, onOpenSubTag,
          }}
        />
      )}
    />
  )

  return (
    <div
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault()
        setMenu({ x: e.clientX, y: e.clientY })
      }}
      className={`cursor-pointer rounded-lg border px-3 py-2 transition-all select-none
        ${selected
          ? 'border-haruto-sea bg-haruto-sea/5'
          : 'border-neutral-200/80 bg-white hover:border-haruto-sea/50 hover:shadow-sm dark:border-neutral-700/70 dark:bg-neutral-900'}`}
    >
      {base}

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

      {/* 右键菜单：与看板完全一致（构建器复用） */}
      {menu && (
        <FloatingMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          entries={buildTaskContextMenu(task, {
            allTasks,
            tags,
            subTags,
            sections,
            onRequestAddSubtask: () => setSubInput(true),
            onSetPriority,
            onSetMasterTask,
            onTogglePinned,
            onUpdateTag,
            onUpdateTaskSection,
            onSetDueDate: onUpdateTaskDue,
            onPickDate: () => setPickingDate(true),
            onPomodoro,
            onDeleteRequest: () => setConfirmDelete(true),
          })}
        />
      )}

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
