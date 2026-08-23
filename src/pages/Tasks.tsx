// 任务页：按侧边栏第二层选中的清单显示（activeListId 由 App 传入）
import type { Task, Tag } from '../types'
import { TaskList, todayStr } from './Today'

export default function Tasks(props: {
  tasks: Task[]
  tags: Tag[]
  activeListId: string // 'all' | 'today' | tagId
  onAdd: (title: string, dueDate: string | null, tagId: string | null) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  onPomodoro: (t: Task) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { tasks, tags, activeListId, onAdd, onUpdate, onDelete, onPomodoro, selectedId, onSelect } = props
  const tagMap = new Map(tags.map((t) => [t.id, t]))
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

  const listProps = { tagMap, allTasks: tasks, tags, mainTasks, onUpdate, onDelete, onPomodoro, selectedId, onSelect }
  const activeTag = activeListId !== 'all' && activeListId !== 'today' ? tagMap.get(activeListId) : null

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

      {groups.map((g) => (
        <TaskList key={g.name} label={`${g.name} ${g.items.length}`} tasks={g.items} {...listProps} />
      ))}
      <TaskList label={`已完成 ${done.length}`} tasks={done} {...listProps} />
    </div>
  )
}
