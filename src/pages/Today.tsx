// 今日页：今天到期任务的汇总（SPEC F1「今日任务」顶置页）
import { useState } from 'react'
import type { Task, Tag } from '../types'

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface TaskRowProps {
  task: Task
  tag: Tag | null
  children: Task[] // 子任务
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  onPomodoro: (t: Task) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export default function Today(props: {
  tasks: Task[]
  tags: Tag[]
  onAdd: (title: string, dueDate: string | null, tagId: string | null) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  onPomodoro: (t: Task) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { tasks, tags, onAdd, onUpdate, onDelete, onPomodoro, selectedId, onSelect } = props
  const today = todayStr()
  const tagMap = new Map(tags.map((t) => [t.id, t]))
  const mainTasks = tasks.filter((t) => !t.parentTaskId && t.dueDate === today)
  const pending = mainTasks.filter((t) => !t.done)
  const done = mainTasks.filter((t) => t.done)
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
            onAdd(e.currentTarget.value.trim(), today, null)
            e.currentTarget.value = ''
          }
        }}
      />

      <TaskList label={`待办 ${pending.length}`} tasks={pending} tagMap={tagMap} allTasks={tasks} onUpdate={onUpdate} onDelete={onDelete} onPomodoro={onPomodoro} selectedId={selectedId} onSelect={onSelect} showEmpty />
      <TaskList label={`已完成 ${done.length}`} tasks={done} tagMap={tagMap} allTasks={tasks} onUpdate={onUpdate} onDelete={onDelete} onPomodoro={onPomodoro} selectedId={selectedId} onSelect={onSelect} />
    </div>
  )
}

export function TaskList({
  label, tasks, tagMap, allTasks, onUpdate, onDelete, onPomodoro, selectedId, onSelect, showEmpty,
}: {
  label: string
  tasks: Task[]
  tagMap: Map<string, Tag>
  allTasks: Task[]
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  onPomodoro: (t: Task) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  showEmpty?: boolean
}) {
  if (!tasks.length && !showEmpty) return null
  return (
    <div className="mt-6">
      <div className="text-xs font-medium text-neutral-400 mb-2">{label}</div>
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          tag={t.tagId ? tagMap.get(t.tagId) ?? null : null}
          children={allTasks.filter((c) => c.parentTaskId === t.id)}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onPomodoro={onPomodoro}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
      {!tasks.length && (
        <div className="text-sm text-neutral-300 dark:text-neutral-600 py-4">空空如也</div>
      )}
    </div>
  )
}

// 单条任务：勾选完成 / 双击改标题 / 点击看详情 / 子任务进度条 / 🍅番茄钟
export function TaskRow({
  task, tag, children, onUpdate, onDelete, onPomodoro, selectedId, onSelect,
}: TaskRowProps) {
  const [editing, setEditing] = useState(false)
  const doneChildren = children.filter((c) => c.done).length
  const pct = children.length ? Math.round((doneChildren / children.length) * 100) : 0

  return (
    <div
      onClick={() => onSelect(task.id === selectedId ? null : task.id)}
      className={`task-item group px-3 py-2.5 rounded-lg cursor-pointer
        ${selectedId === task.id ? 'bg-haruto-sea/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
    >
      <div className="flex items-center gap-3">
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
          <span className={`flex-1 text-sm truncate ${task.done ? 'line-through text-neutral-400' : ''}`}>
            {tag && <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: tag.color }} />}
            {task.title}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onPomodoro(task) }}
          className="text-xs hover:scale-110 transition-transform"
          title="开始番茄钟专注"
        >
          🍅
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
          className="text-xs text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
          title="删除"
        >
          🗑
        </button>
      </div>
      {/* 子任务进度条（SPEC F1：主任务框内、标题下方） */}
      {children.length > 0 && (
        <div className="ml-7 mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: tag?.color ?? '#3d7ea6' }}
            />
          </div>
          <span className="text-[10px] text-neutral-400 tabular-nums">{doneChildren}/{children.length}</span>
        </div>
      )}
    </div>
  )
}
