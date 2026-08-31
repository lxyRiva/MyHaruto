// 列表任务卡片（今日/最近7天视图用，与看板 TaskCard 交互一致但布局不同）：
// 勾选完成原位灰显 / 左键 → 右侧栏详情（onSelect，非悬空弹窗）/ 右键 → 与看板相同的七项菜单；
// 标题下第一行：描述或检查事项第一项（浅色）；第二行：H2标识（色点+名，无分组回退 H1 标签）+ 专注分钟；右侧日期；
// 子任务嵌套 + 折叠（默认显示第一个，复用看板交互）。
import { useState } from 'react'
import type { ChecklistItem, FocusSession, Section, SubTag, Tag, Task } from '../types'
import { IconChat, IconChevron, IconClock } from './icons'
import FloatingMenu from './FloatingMenu'
import { buildTaskContextMenu, DatePickerModal, type Priority } from './BoardView'

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
  onDeleteTaskRecursive: (id: string) => void
  onOpenSubTag: (subTagId: string) => void // 修正4：点击 H2 归属跳转看板
}

const PRIO_COLOR: Record<Priority, string | null> = { high: '#ef4444', mid: '#f59e0b', low: '#3b82f6', none: null }

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
  onDeleteTaskRecursive,
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
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [pickingDate, setPickingDate] = useState(false)
  const today = localToday()
  const prio = (task.priority ?? 'none') as Priority
  const prioColor = PRIO_COLOR[prio]
  const minutes = minutesOf(task.id)

  // H2 标识：sectionId → Section → SubTag；无分组回退 H1 标签（tagId）
  const h2 = subTags.find((st) => st.id === sections.find((s) => s.id === task.sectionId)?.subTagId)
  const h1Tag = tags.find((t) => t.id === task.tagId)
  const badge = h2 ? { name: h2.name, color: h2.color, emoji: h2.emoji } : h1Tag ? { name: h1Tag.name, color: h1Tag.color, emoji: '' } : null

  // 标题下第一行：描述第一行，否则检查事项第一项
  const firstLine = task.description
    ? task.description.split('\n')[0]
    : task.checklistItems[0]?.text

  const children = allTasks.filter((t) => t.parentTaskId === task.id && !seen.has(t.id))
  const visibleChildren = expanded ? children : children.slice(0, 1)
  const childSeen = (id: string) => new Set([...seen, id])

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
      <div className="flex items-start gap-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleDone(task.id)
          }}
          title={task.done ? '标记为未完成' : '标记为完成'}
          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border transition-colors
            ${
              task.done
                ? 'border-[#5b8c5a] bg-[#5b8c5a] text-white'
                : 'border-neutral-300 text-transparent hover:border-haruto-sea dark:border-neutral-600'
            }`}
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2.5 6 5 8.5 9.5 3.5" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            {prioColor && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: prioColor }} title={`优先级：${prio}`} />}
            <div className={`min-w-0 flex-1 text-sm leading-snug break-all ${task.done ? 'text-neutral-400 line-through' : 'text-neutral-700 dark:text-neutral-200'}`}>
              {task.title}
            </div>
            {/* 右侧日期：今天紫色，其他黑色；无日期不显示 */}
            {task.dueDate && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDateOpen(true)
                }}
                title="点击修改日期与提醒"
                className={`shrink-0 text-[11px] tabular-nums hover:text-haruto-sea hover:underline ${
                  task.dueDate === today ? 'font-medium text-purple-500' : 'text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {task.dueDate === today ? '今天' : task.dueDate.slice(5).replace('-', '/')}
              </button>
            )}
            {children.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded((v) => !v)
                }}
                title={expanded ? '收起子任务' : '展开子任务'}
                className="shrink-0 text-neutral-400 hover:text-haruto-sea"
              >
                <IconChevron open={expanded} />
              </button>
            )}
          </div>
          {firstLine && <div className="mt-0.5 truncate text-[11px] text-neutral-400">{firstLine}</div>}
          <div className="mt-1 flex items-center gap-2 text-[11px]">
            {badge && (
              <span className="flex min-w-0 items-center gap-1" title={badge.name}>
                {badge.emoji ? (
                  <span className="shrink-0 text-[10px]">{badge.emoji}</span>
                ) : (
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: badge.color }} />
                )}
                {h2 ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenSubTag(h2.id)
                    }}
                    className="cursor-pointer truncate hover:text-haruto-sea hover:underline"
                    style={{ color: undefined }}
                    title="查看该标签看板"
                  >
                    {badge.name}
                  </span>
                ) : (
                  <span className="truncate" style={{ color: badge.color }}>{badge.name}</span>
                )}
              </span>
            )}
            {task.isPinnedToday && <span className="text-[10px] text-haruto-sea">置顶</span>}
            {minutes > 0 && (
              <span className="flex shrink-0 items-center gap-0.5 text-neutral-400 tabular-nums" title={`已专注 ${minutes} 分钟`}>
                <span className="[&>svg]:h-3 [&>svg]:w-3">
                  <IconClock />
                </span>
                {minutes}分
              </span>
            )}
            {task.taskComments.length > 0 && (
              <span className="flex items-center gap-0.5 text-[#6a994e]" title={`${task.taskComments.length} 条留言`}>
                <span className="[&>svg]:h-3 [&>svg]:w-3">
                  <IconChat />
                </span>
                <span className="tabular-nums">{task.taskComments.length}</span>
              </span>
            )}
          </div>
        </div>
      </div>

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
              setExpanded(true)
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

      {children.length > 0 && (
        <div className="mt-2 space-y-2 border-l-2 border-neutral-100 pl-2.5 dark:border-neutral-800">
          {visibleChildren.map((c) => (
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
                onDeleteTaskRecursive, onOpenSubTag,
              }}
            />
          ))}
          {!expanded && children.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(true)
              }}
              className="pl-1 text-[10px] text-neutral-400 transition-colors hover:text-haruto-sea"
            >
              还有 {children.length - 1} 项
            </button>
          )}
        </div>
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
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/30 animate-[fadeSlideIn_.15s_ease]"
          onMouseDown={(e) => e.target === e.currentTarget && setConfirmDelete(false)}
        >
          <div className="w-72 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800">
            <div className="text-sm font-semibold select-none">删除该任务及其所有子任务？</div>
            <div className="mt-1 text-xs text-neutral-400 select-none">{task.title}</div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  onDeleteTaskRecursive(task.id)
                  setConfirmDelete(false)
                }}
                className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-medium text-white transition-opacity select-none hover:opacity-90"
              >
                确认删除
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg border border-neutral-200 py-2 text-xs text-neutral-500 transition-colors select-none hover:text-neutral-700 dark:border-neutral-600 dark:hover:text-neutral-200"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
