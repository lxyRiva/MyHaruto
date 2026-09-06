// 任务页（全部/清单视图，RF-Fix2 起改用 ListTaskCard 渲染 + 底部已完成折叠区垫底）
// 分组语义与今日/最近7天统一（Fix1）：done 未聚合 → 原日期组灰显原位；根 aggregated → 出组进折叠区
import { useMemo } from 'react'
import type { FocusSession, Section, SubTag, Task, Tag } from '../types'
import { todayStr } from './Today'
import ListTaskCard, { DoneFoldSection, type ListCardCallbacks } from '../components/ListTaskCard'
import { isRootAggregated } from '../features/tasks/utils/tree'
import type { Priority } from '../features/tasks/types'

export default function Tasks(props: {
  tasks: Task[]
  tags: Tag[]
  subTags: SubTag[]
  sections: Section[]
  focusSessions: FocusSession[]
  aiName: string
  activeListId: string // 'all' | 'today' | tagId
  onAdd: (title: string, dueDate: string | null, tagId: string | null) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  minutesOf: (id: string) => number
  onToggleDone: (id: string) => void
  onToggleChecklist: (taskId: string, itemId: string) => void
  onAddChecklistItem: (taskId: string, text: string) => void
  onUpdateChecklistItem: (taskId: string, itemId: string, patch: Partial<import('../types').ChecklistItem>) => void
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
  onOpenSubTag: (subTagId: string) => void
}) {
  const { tasks, tags, subTags, sections, focusSessions, aiName, activeListId, onAdd, selectedId, onSelect, minutesOf } = props
  const today = todayStr()
  // 筛选：按 L2 选中项（全部/今天/H1 标签）
  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          !t.parentTaskId &&
          (activeListId === 'all'
            ? true
            : activeListId === 'today'
              ? t.dueDate === today || t.isPinnedToday
              : t.tagId === activeListId)
      ),
    [tasks, activeListId, today]
  )

  // RF-Fix2 语义：done 未聚合 → 原日期组灰显原位；根 aggregated → 出组进底部折叠区
  const notFolded = (t: Task) => !t.done || !isRootAggregated(tasks, t)
  const groups: { name: string; items: Task[] }[] = [
    { name: '今天', items: filtered.filter((t) => (t.dueDate === today || t.isPinnedToday) && notFolded(t)) },
    { name: '即将到来', items: filtered.filter((t) => t.dueDate && t.dueDate > today && notFolded(t)) },
    { name: '更早', items: filtered.filter((t) => t.dueDate && t.dueDate < today && notFolded(t)) },
    { name: '无日期', items: filtered.filter((t) => !t.dueDate && notFolded(t)) },
  ]
  // 已完成折叠区成员：现有筛选 ∩ 根 aggregated（根任务，子孙嵌套跟随）
  const doneRoots = filtered.filter((t) => t.done && isRootAggregated(tasks, t))
  const activeTag = activeListId !== 'all' && activeListId !== 'today' ? tags.find((t) => t.id === activeListId) : null

  const callbacks: ListCardCallbacks = {
    aiName,
    tags,
    subTags,
    sections,
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
    onSetMasterTask: props.onSetMasterTask,
    onPomodoro: props.onPomodoro,
    onDeleteTaskRecursive: props.onDeleteTaskRecursive,
    onOpenSubTag: props.onOpenSubTag,
  }
  const cardOf = (t: Task) => (
    <ListTaskCard
      key={t.id}
      task={t}
      allTasks={tasks}
      depth={0}
      seen={new Set([t.id])}
      selected={selectedId === t.id}
      onSelect={() => onSelect(selectedId === t.id ? null : t.id)}
      minutesOf={minutesOf}
      {...callbacks}
    />
  )

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold">
        任务 {activeTag && <span className="text-sm font-normal" style={{ color: activeTag.color }}>· {activeTag.name}</span>}
      </h1>

      <div className="mt-4 flex gap-2">
        <input
          placeholder={`新任务${activeTag ? ` → ${activeTag.name}` : ''}，回车保存`}
          className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-700
            bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm outline-none focus:border-haruto-sea"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              const dateInput = document.getElementById('new-date') as HTMLInputElement
              onAdd(e.currentTarget.value.trim(), dateInput.value || null, activeTag ? activeTag.id : null)
              e.currentTarget.value = ''
            }
          }}
        />
        <input
          id="new-date"
          type="date"
          className="rounded-lg border border-neutral-200 dark:border-neutral-700
            bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm outline-none focus:border-haruto-sea"
        />
      </div>

      {groups.map((g) =>
        g.items.length ? (
          <div key={g.name} className="mt-6">
            <div className="text-xs font-medium text-neutral-400 mb-2">{g.name} {g.items.length}</div>
            <div className="space-y-2">{g.items.map(cardOf)}</div>
          </div>
        ) : null,
      )}
      <DoneFoldSection
        roots={doneRoots}
        tasks={tasks}
        selectedId={selectedId}
        onSelect={onSelect}
        minutesOf={minutesOf}
        callbacks={callbacks}
      />
    </div>
  )
}
