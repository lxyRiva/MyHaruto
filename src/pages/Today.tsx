// 今日页：今天到期任务的汇总（SPEC F1「今日任务」顶置页，M2 再加手动置顶）
import { useState } from 'react'
import type { Task } from '../types'

interface Props {
  tasks: Task[]
  onAdd: (title: string, dueDate: string | null) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Today({ tasks, onAdd, onUpdate, onDelete, selectedId, onSelect }: Props) {
  const today = todayStr()
  const todayTasks = tasks.filter((t) => t.dueDate === today)
  const pending = todayTasks.filter((t) => !t.done)
  const done = todayTasks.filter((t) => t.done)
  const week = ['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()]

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold">
        今天 <span className="text-sm font-normal text-neutral-400">{today} 星期{week}</span>
      </h1>

      <input
        placeholder="添加今天的任务，回车保存"
        className="mt-4 w-full rounded-lg border border-neutral-200 dark:border-neutral-700
          bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm outline-none focus:border-haruto-sea"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
            onAdd(e.currentTarget.value.trim(), today)
            e.currentTarget.value = ''
          }
        }}
      />

      <TaskList label={`待办 ${pending.length}`} tasks={pending} onUpdate={onUpdate} onDelete={onDelete} selectedId={selectedId} onSelect={onSelect} showEmpty />
      <TaskList label={`已完成 ${done.length}`} tasks={done} onUpdate={onUpdate} onDelete={onDelete} selectedId={selectedId} onSelect={onSelect} />
    </div>
  )
}

// 任务列表（任务页也复用）
export function TaskList({
  label, tasks, onUpdate, onDelete, selectedId, onSelect, showEmpty,
}: {
  label: string
  tasks: Task[]
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  showEmpty?: boolean
}) {
  if (!tasks.length && !showEmpty) return null
  return (
    <div className="mt-6">
      <div className="text-xs font-medium text-neutral-400 mb-2">{label}</div>
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} onUpdate={onUpdate} onDelete={onDelete} selectedId={selectedId} onSelect={onSelect} />
      ))}
      {!tasks.length && (
        <div className="text-sm text-neutral-300 dark:text-neutral-600 py-4">空空如也</div>
      )}
    </div>
  )
}

// 单条任务：勾选完成 / 双击改标题 / 点击看详情 / 悬停出删除
export function TaskRow({
  task, onUpdate, onDelete, selectedId, onSelect,
}: {
  task: Task
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div
      onClick={() => onSelect(task.id === selectedId ? null : task.id)}
      className={`task-item group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer
        ${selectedId === task.id ? 'bg-haruto-sea/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
    >
      <input
        type="checkbox"
        checked={task.done}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onUpdate(task.id, { done: e.target.checked })}
        className="accent-haruto-sea w-4 h-4"
      />
      {editing ? (
        <input
          autoFocus
          defaultValue={task.title}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => { onUpdate(task.id, { title: e.target.value.trim() || task.title }); setEditing(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="flex-1 text-sm bg-transparent border-b border-haruto-sea outline-none"
        />
      ) : (
        <span
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
          className={`flex-1 text-sm ${task.done ? 'line-through text-neutral-400' : ''}`}
        >
          {task.title}
        </span>
      )}
      <span className="text-xs opacity-40" title="番茄钟 M2 上线">🍅</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
        className="text-xs text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
        title="删除"
      >
        🗑
      </button>
    </div>
  )
}
