// 任务页：按 L2 清单树选中项过滤，任务以无限嵌套树展示
import type { Task, Tag } from '../types'
import { TaskNode, todayStr } from './Today'

export default function Tasks(props: {
  tasks: Task[]
  tags: Tag[]
  activeListId: string // 'all' | 'today' | tagId
  onAdd: (title: string, dueDate: string | null, tagId: string | null) => void
  onAddSub: (title: string, parentId: string) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  onPomodoro: (t: Task) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { tasks, tags, activeListId, onAdd, onAddSub, onUpdate, onDelete, onPomodoro, selectedId, onSelect } = props
  const mainTasks = tasks.filter((t) => !t.parentTaskId)
  const today = todayStr()
  const filtered = mainTasks.filter((t) =>
    activeListId === 'all' ? true
    : activeListId === 'today' ? t.dueDate === today || t.isPinnedToday
    : t.tagId === activeListId
  )

  const groups: { name: string; items: Task[] }[] = [
    { name: '今天', items: filtered.filter((t) => !t.done && (t.dueDate === today || t.isPinnedToday)) },
    { name: '即将到来', items: filtered.filter((t) => !t.done && t.dueDate && t.dueDate > today) },
    { name: '更早', items: filtered.filter((t) => !t.done && t.dueDate && t.dueDate < today) },
    { name: '无日期', items: filtered.filter((t) => !t.done && !t.dueDate) },
  ]
  const done = filtered.filter((t) => t.done)
  const activeTag = activeListId !== 'all' && activeListId !== 'today' ? tags.find((t) => t.id === activeListId) : null

  const nodeProps = { allTasks: tasks, tags, onUpdate, onDelete, onAdd: onAddSub, onPomodoro, selectedId, onSelect }

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
            {g.items.map((t) => (
              <TaskNode key={t.id} task={t} depth={0} {...nodeProps} />
            ))}
          </div>
        ) : null,
      )}
      {done.length > 0 && (
        <div className="mt-6">
          <div className="text-xs font-medium text-neutral-400 mb-2">已完成 {done.length}</div>
          {done.map((t) => (
            <TaskNode key={t.id} task={t} depth={0} {...nodeProps} />
          ))}
        </div>
      )}
    </div>
  )
}
