// 任务页：全部任务，按日期分组显示（标签分类 M2 上线）
import type { Task } from '../types'
import { TaskList, todayStr } from './Today'

interface Props {
  tasks: Task[]
  onAdd: (title: string, dueDate: string | null) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export default function Tasks({ tasks, onAdd, onUpdate, onDelete, selectedId, onSelect }: Props) {
  const pending = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  // 按日期分组：今天 / 未来 / 更早 / 无日期
  const today = todayStr()
  const groups: { name: string; items: Task[] }[] = [
    { name: '今天', items: pending.filter((t) => t.dueDate === today) },
    { name: '即将到来', items: pending.filter((t) => t.dueDate && t.dueDate > today) },
    { name: '更早', items: pending.filter((t) => t.dueDate && t.dueDate < today) },
    { name: '无日期', items: pending.filter((t) => !t.dueDate) },
  ]

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold">任务</h1>

      <div className="mt-4 flex gap-2">
        <input
          id="new-title"
          placeholder="新任务标题，回车保存"
          className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-700
            bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm outline-none focus:border-haruto-sea"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              const dateInput = document.getElementById('new-date') as HTMLInputElement
              onAdd(e.currentTarget.value.trim(), dateInput.value || null)
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
        <TaskList
          key={g.name}
          label={`${g.name} ${g.items.length}`}
          tasks={g.items}
          onUpdate={onUpdate}
          onDelete={onDelete}
          selectedId={selectedId}
          onSelect={onSelect}
          showEmpty={false}
        />
      ))}
      <TaskList
        label={`已完成 ${done.length}`}
        tasks={done}
        onUpdate={onUpdate}
        onDelete={onDelete}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  )
}
