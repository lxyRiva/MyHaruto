// 今日页 + 共享任务条目（右键菜单：日期/优先级/子任务/关联主任务/置顶/移动标签/专注/删除）
import { useState } from 'react'
import type { Task, Tag } from '../types'
import FloatingMenu from '../components/FloatingMenu'

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDaysStr(base: string, n: number) {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  mid: 'bg-amber-400',
  low: 'bg-sky-400',
}
const PRIORITY_LABEL: Record<string, string> = { high: '高', mid: '中', low: '低', none: '无' }

export interface TaskRowProps {
  task: Task
  tag: Tag | null
  children: Task[]
  tags: Tag[]
  mainTasks: Task[] // 可关联的主任务池
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
  // 今日页：今天到期 或 手动置顶 的主任务
  const mainTasks = tasks.filter((t) => !t.parentTaskId)
  const todayMain = mainTasks.filter((t) => t.dueDate === today || t.isPinnedToday)
  const pinned = todayMain.filter((t) => t.isPinnedToday && t.dueDate !== today)
  const normal = todayMain.filter((t) => !pinned.includes(t))
  const pending = normal.filter((t) => !t.done)
  const done = todayMain.filter((t) => t.done)
  const week = ['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()]

  const listProps = { tagMap, allTasks: tasks, tags, mainTasks, onUpdate, onDelete, onPomodoro, selectedId, onSelect }

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

      <TaskList label={`已置顶 ${pinned.length}`} tasks={pinned} {...listProps} />
      <TaskList label={`待办 ${pending.length}`} tasks={pending} {...listProps} showEmpty />
      <TaskList label={`已完成 ${done.length}`} tasks={done} {...listProps} />
    </div>
  )
}

export function TaskList({
  label, tasks, tagMap, allTasks, tags, mainTasks, onUpdate, onDelete, onPomodoro, selectedId, onSelect, showEmpty,
}: {
  label: string
  tasks: Task[]
  tagMap: Map<string, Tag>
  allTasks: Task[]
  tags: Tag[]
  mainTasks: Task[]
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
          tags={tags}
          mainTasks={mainTasks}
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

// 单条任务：勾选 / 双击改标题 / 点击详情 / 子任务进度 / 🍅 / 右键菜单
export function TaskRow({
  task, tag, children, tags, mainTasks, onUpdate, onDelete, onPomodoro, selectedId, onSelect,
}: TaskRowProps) {
  const [editing, setEditing] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const doneChildren = children.filter((c) => c.done).length
  const pct = children.length ? Math.round((doneChildren / children.length) * 100) : 0
  const today = todayStr()

  // 右键菜单内容（问题1：参照滴答右键，裁剪到 8 组）
  const menuEntries = [
    { header: true, label: '日期' },
    { label: '今天', onClick: () => onUpdate(task.id, { dueDate: today }) },
    { label: '明天', onClick: () => onUpdate(task.id, { dueDate: addDaysStr(today, 1) }) },
    { label: '清除日期', onClick: () => onUpdate(task.id, { dueDate: null }) },
    { header: true, label: '优先级' },
    ...(['high', 'mid', 'low', 'none'] as const).map((p) => ({
      label: `${PRIORITY_LABEL[p]}${task.priority === p ? ' ✓' : ''}`,
      onClick: () => onUpdate(task.id, { priority: p }),
    })),
    { header: true, label: '操作' },
    { label: '＋ 添加子任务（在详情栏）', onClick: () => onSelect(task.id) },
    ...mainTasks.filter((m) => m.id !== task.id && !children.some((c) => c.id === m.id)).length
      ? [{ header: true, label: '关联主任务（时长并入其统计）' } as const,
        ...mainTasks
          .filter((m) => m.id !== task.id && !children.some((c) => c.id === m.id))
          .slice(0, 8)
          .map((m) => ({
            label: `${task.masterTaskId === m.id ? '✓ ' : ''}→ ${m.title}`,
            onClick: () => onUpdate(task.id, { masterTaskId: m.id }),
          })),
        { label: '取消关联', onClick: () => onUpdate(task.id, { masterTaskId: null }) }] as { label: string; onClick?: () => void }[]
      : [],
    {
      label: task.isPinnedToday ? '取消置顶今日' : '📌 置顶到今日',
      onClick: () => onUpdate(task.id, { isPinnedToday: !task.isPinnedToday }),
    },
    { label: '🍅 开始专注', onClick: () => onPomodoro(task) },
    { label: '🗑 删除', danger: true, onClick: () => onDelete(task.id) },
    ...(tags.length
      ? [{ header: true, label: '移动到' } as const, ...tags.map((t) => ({
          label: `● ${t.name}${task.tagId === t.id ? ' ✓' : ''}`,
          onClick: () => onUpdate(task.id, { tagId: t.id }),
        }))] as { label: string; onClick?: () => void }[]
      : []),
  ]

  return (
    <div
      onClick={() => onSelect(task.id === selectedId ? null : task.id)}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setMenu({ x: e.clientX, y: e.clientY })
      }}
      className={`task-item group px-3 py-2.5 rounded-lg cursor-pointer
        ${selectedId === task.id ? 'bg-haruto-sea/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
    >
      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={task.done}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdate(task.id, { done: e.target.checked })}
          className="accent-haruto-sea w-4 h-4 shrink-0"
        />
        {task.priority && task.priority !== 'none' && (
          <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} title={`优先级：${PRIORITY_LABEL[task.priority]}`} />
        )}
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
            {task.tagId && tag && <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: tag.color }} />}
            {task.title}
            {task.masterTaskId && <span className="ml-1.5 text-[10px] text-neutral-400">↗已关联</span>}
          </span>
        )}
        {task.dueDate && (
          <span className={`text-[10px] tabular-nums shrink-0 ${task.dueDate === today ? 'text-haruto-sea' : 'text-neutral-400'}`}>
            {task.dueDate.slice(5).replace('-', '/')}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onPomodoro(task) }}
          className="text-xs hover:scale-110 transition-transform shrink-0"
          title="开始番茄钟专注"
        >
          🍅
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
          className="text-xs text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity shrink-0"
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
      {menu && <FloatingMenu x={menu.x} y={menu.y} entries={menuEntries} onClose={() => setMenu(null)} />}
    </div>
  )
}
