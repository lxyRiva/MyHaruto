// 最近7天视图：已逾期 → 今天（含置顶）→ 未来6天按日期分组；不显示已完成与更远未来
// 任务卡片与今日页一致（ListTaskCard，左键选中进右栏）；顶部新建任务行（无日期默认不填）
import { useMemo } from 'react'
import type { SubTag, Task } from '../types'
import ListTaskCard, { type ListCardCallbacks } from './ListTaskCard'
import NewTaskBar from './NewTaskBar'
import { boardSort, type Priority } from './BoardView'

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(base: string, n: number): string {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default function Recent7View(props: {
  tasks: Task[]
  subTags: SubTag[]
  defaultDueDate?: string | null
} & ListCardCallbacks & {
  selectedId: string | null
  onSelect: (id: string | null) => void
  onAddTaskWithOptions: (title: string, opts: { dueDate?: string | null; priority?: Priority; tagId?: string | null }) => void
  minutesOf: (id: string) => number
}) {
  const { tasks, subTags, selectedId, onSelect, onAddTaskWithOptions, minutesOf, defaultDueDate = null } = props
  const cardCallbacks: ListCardCallbacks = {
    aiName: props.aiName,
    tags: props.tags,
    subTags: props.subTags,
    sections: props.sections,
    onToggleDone: props.onToggleDone,
    onToggleChecklist: props.onToggleChecklist,
    onAddChecklistItem: props.onAddChecklistItem,
    onUpdateChecklistItem: props.onUpdateChecklistItem,
    onDeleteChecklistItem: props.onDeleteChecklistItem,
    onSetTaskReminder: props.onSetTaskReminder,
    onUpdateTaskDue: props.onUpdateTaskDue,
    onAddSubtask: props.onAddSubtask,
    onUpdateTag: props.onUpdateTag,
    onUpdateTaskSection: props.onUpdateTaskSection,
    onTogglePinned: props.onTogglePinned,
    onSetPriority: props.onSetPriority,
    onPomodoro: props.onPomodoro,
    onDeleteTaskRecursive: props.onDeleteTaskRecursive,
    onOpenSubTag: props.onOpenSubTag,
  }

  const today = localToday()
  const mainTasks = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks])

  const overdue = mainTasks.filter((t) => !t.done && t.dueDate && t.dueDate < today).sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  const overdueIds = new Set(overdue.map((t) => t.id))
  const todays = mainTasks
    .filter((t) => !t.done && !overdueIds.has(t.id) && (t.dueDate === today || t.isPinnedToday))
    .sort(boardSort)

  const futureGroups = Array.from({ length: 6 }, (_, i) => {
    const date = addDays(today, i + 1)
    const items = mainTasks.filter((t) => !t.done && t.dueDate === date).sort(boardSort)
    const label = i === 0 ? '明天' : `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日`
    return { date, label, items }
  }).filter((g) => g.items.length > 0)

  const group = (label: string, items: Task[], tone: 'normal' | 'danger' = 'normal') =>
    items.length > 0 ? (
      <div className="mt-5">
        <div className={`mb-2 text-xs font-medium ${tone === 'danger' ? 'text-red-400' : 'text-neutral-400'}`}>
          {label} {items.length}
        </div>
        <div className="space-y-2">
          {items.map((t) => (
            <ListTaskCard
              key={t.id}
              task={t}
              allTasks={tasks}
              depth={0}
              seen={new Set([t.id])}
              selected={selectedId === t.id}
              onSelect={() => onSelect(selectedId === t.id ? null : t.id)}
              minutesOf={minutesOf}
              {...cardCallbacks}
            />
          ))}
        </div>
      </div>
    ) : null

  return (
    <div className="flex h-full flex-col p-6">
      <div className="max-w-3xl">
        <h1 className="text-xl font-bold">
          最近7天 <span className="text-sm font-normal text-neutral-400">{today} 起</span>
        </h1>
        <div className="mt-4">
          <NewTaskBar
            subTags={subTags}
            defaultDueDate={defaultDueDate}
            onAdd={(title, due, priority, tagId) => onAddTaskWithOptions(title, { dueDate: due, priority, tagId })}
          />
        </div>
      </div>
      <div className="mt-2 max-w-3xl flex-1 overflow-y-auto pb-6">
        {group('已逾期', overdue, 'danger')}
        {group('今天', todays)}
        {futureGroups.map((g) => group(g.label, g.items))}
        {overdue.length === 0 && todays.length === 0 && futureGroups.length === 0 && (
          <div className="mt-10 text-center text-sm text-neutral-300 dark:text-neutral-600">未来 7 天没有安排</div>
        )}
      </div>
    </div>
  )
}
