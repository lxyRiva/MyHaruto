// 任务页（全部/清单视图，RF-Fix2 起改用 ListTaskCard 渲染 + 底部已完成折叠区垫底）
// 分组语义与今日/最近7天统一（Fix1）：done 未聚合 → 原日期组灰显原位；根 aggregated → 出组进折叠区
import { useMemo } from 'react'
import type { FocusSession, Section, SubTag, Task, Tag } from '../../../shared/types'
import { todayStr } from '../../../shared/utils/date'
import ListTaskCard, { type ListCardCallbacks } from '../components/ListTaskCard'
import { DoneFoldSection } from '../components/DoneFoldSection'
import NewTaskBar from '../components/NewTaskBar'
import { collapsedOf } from '../utils/taskTree'
import { pinnedGroupFirst } from '../utils/taskSort'
import type { Priority } from '../types'

export default function Tasks(props: {
  tasks: Task[]
  tags: Tag[]
  subTags: SubTag[]
  sections: Section[]
  focusSessions: FocusSession[]
  aiName: string
  activeListId: string // 'all' | 'today' | tagId
  onAddTaskWithOptions: (title: string, opts: { dueDate?: string | null; priority?: Priority; tagId?: string | null }) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  minutesOf: (id: string) => number
  onToggleDone: (id: string) => void
  onToggleChecklist: (taskId: string, itemId: string) => void
  onAddChecklistItem: (taskId: string, text: string) => void
  onUpdateChecklistItem: (taskId: string, itemId: string, patch: Partial<import('../../../shared/types').ChecklistItem>) => void
  onDeleteChecklistItem: (taskId: string, itemId: string) => void
  onSetTaskReminder: (id: string, remindAt: string | null, remindDaysBefore: number | null) => void
  onUpdateTaskDue: (id: string, dueDate: string | null) => void
  onUpdateTask: (id: string, patch: Partial<Task>) => void // RF-P3「置顶该组」通路（listViewProps 已下发）
  onAddSubtask: (parentId: string, title: string) => void
  onUpdateTag: (id: string, tagId: string | null) => void
  onUpdateTaskSection: (id: string, sectionId: string | null) => void
  onTogglePinned: (id: string) => void
  onSetPriority: (id: string, p: Priority) => void
  onSetMasterTask: (id: string, masterId: string | null) => void
  onPomodoro: (t: Task) => void
  onDeleteTaskTree: (id: string) => void
  onOpenSubTag: (subTagId: string) => void
}) {
  const { tasks, tags, subTags, sections, focusSessions, aiName, activeListId, selectedId, onSelect, minutesOf } = props
  const today = todayStr()
  const foldedOf = collapsedOf(tasks)
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
  const notFolded = (t: Task) => !t.done || !foldedOf(t)
  const groups: { name: string; items: Task[] }[] = [
    { name: '今天', items: filtered.filter((t) => (t.dueDate === today || t.isPinnedToday) && notFolded(t)) },
    { name: '即将到来', items: filtered.filter((t) => t.dueDate && t.dueDate > today && notFolded(t)) },
    { name: '更早', items: filtered.filter((t) => t.dueDate && t.dueDate < today && notFolded(t)) },
    { name: '无日期', items: filtered.filter((t) => !t.dueDate && notFolded(t)) },
  ]
  // 已完成折叠区成员：现有筛选 ∩ 根 aggregated（根任务，子孙嵌套跟随）
  const doneRoots = filtered.filter((t) => t.done && foldedOf(t))
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
    onUpdateTask: props.onUpdateTask,
    onAddSubtask: props.onAddSubtask,
    onUpdateTag: props.onUpdateTag,
    onUpdateTaskSection: props.onUpdateTaskSection,
    onTogglePinned: props.onTogglePinned,
    onSetPriority: props.onSetPriority,
    onSetMasterTask: props.onSetMasterTask,
    onPomodoro: props.onPomodoro,
    onDeleteTaskTree: props.onDeleteTaskTree,
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

      {/* 新建行（P2b）：换 NewTaskBar 与今日页统一（日期选择器+优先级四旗+H2 标签）；H1 视图下未选标签时兜底挂该 H1 */}
      <div className="mt-4">
        <NewTaskBar
          subTags={props.subTags}
          defaultDueDate={null}
          onAdd={(title, due, priority, tagId) =>
            props.onAddTaskWithOptions(title, { dueDate: due, priority, tagId: tagId ?? (activeTag?.id ?? null) })}
        />
      </div>

      {groups.map((g) =>
        g.items.length ? (
          <div key={g.name} className="mt-6">
            <div className="text-xs font-medium text-neutral-400 mb-2">{g.name} {g.items.length}</div>
            <div className="space-y-2">{pinnedGroupFirst(g.items).map(cardOf)}</div>
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
