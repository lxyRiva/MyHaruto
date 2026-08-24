// 任务树体系：无限嵌套（主任务→子任务→子子任务…），任意层级统一右键、独立计时、行内加子任务
import { useState } from 'react'
import type { Task, Tag } from '../types'
import FloatingMenu, { type MenuEntry } from '../components/FloatingMenu'
import { IconChevron } from '../components/icons'

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDaysStr(base: string, n: number) {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

const PRIORITY_DOT: Record<string, string> = { high: 'bg-red-500', mid: 'bg-amber-400', low: 'bg-sky-400' }
const PRIORITY_LABEL: Record<string, string> = { high: '高', mid: '中', low: '低', none: '无' }

// 收集一个任务的所有子孙 id（防关联成环）
function descendantIds(taskId: string, allTasks: Task[]): Set<string> {
  const out = new Set<string>()
  const walk = (pid: string) => {
    for (const t of allTasks) {
      if (t.parentTaskId === pid && !out.has(t.id)) {
        out.add(t.id)
        walk(t.id)
      }
    }
  }
  walk(taskId)
  return out
}

// 统一右键菜单（所有层级一致，问题1）
function buildMenu(opts: {
  task: Task
  tags: Tag[]
  linkable: Task[] // 可关联的主任务（已排除自身与子孙）
  onUpdate: (id: string, p: Partial<Task>) => void
  onDelete: (id: string) => void
  onPomodoro: (t: Task) => void
  onAddSub: (t: Task) => void // 触发行内添加子任务输入
}): MenuEntry[] {
  const { task, tags, linkable, onUpdate, onDelete, onPomodoro, onAddSub } = opts
  const today = todayStr()
  const e: MenuEntry[] = [
    { header: true, label: '设置日期' },
    { label: '今天', onClick: () => onUpdate(task.id, { dueDate: today }) },
    { label: '明天', onClick: () => onUpdate(task.id, { dueDate: addDaysStr(today, 1) }) },
    { label: '下周', onClick: () => onUpdate(task.id, { dueDate: addDaysStr(today, 7) }) },
    { label: '清除日期', onClick: () => onUpdate(task.id, { dueDate: null }) },
    { header: true, label: '设置优先级' },
    ...(['high', 'mid', 'low', 'none'] as const).map((p) => ({
      label: `${PRIORITY_LABEL[p]}${(task.priority ?? 'none') === p ? ' ✓' : ''}`,
      onClick: () => onUpdate(task.id, { priority: p }),
    })),
    { header: true, label: '' },
    { label: '＋ 添加子任务', onClick: () => onAddSub(task) },
  ]
  if (linkable.length) {
    e.push(
      { header: true, label: '关联主任务（时长并入其统计）' },
      ...linkable.slice(0, 8).map((m) => ({
        label: `${task.masterTaskId === m.id ? '✓ ' : ''}→ ${m.title}`,
        onClick: () => onUpdate(task.id, { masterTaskId: m.id }),
      })),
    )
    if (task.masterTaskId) e.push({ label: '取消关联', onClick: () => onUpdate(task.id, { masterTaskId: null }) })
  }
  e.push(
    { header: true, label: '' },
    {
      label: task.isPinnedToday ? '取消置顶今日' : '📌 置顶今日',
      onClick: () => onUpdate(task.id, { isPinnedToday: !task.isPinnedToday }),
    },
    { label: '🍅 开始专注', onClick: () => onPomodoro(task) },
  )
  if (tags.length) {
    e.push(
      { header: true, label: '移动到...' },
      ...tags.map((t) => ({
        label: `${task.tagId === t.id ? '✓ ' : ''}● ${t.name}`,
        onClick: () => onUpdate(task.id, { tagId: t.id }),
      })),
    )
  }
  e.push({ header: true, label: '' }, { label: '删除', danger: true, onClick: () => onDelete(task.id) })
  return e
}

/* ============ 递归任务节点 ============ */
export function TaskNode(props: {
  task: Task
  allTasks: Task[]
  tags: Tag[]
  depth: number
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  onAdd: (title: string, parentId: string) => void
  onPomodoro: (t: Task) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  defaultExpanded?: boolean
}) {
  const { task, allTasks, tags, depth, onUpdate, onDelete, onAdd, onPomodoro, selectedId, onSelect, defaultExpanded } = props
  const children = allTasks.filter((c) => c.parentTaskId === task.id)
  const [expanded, setExpanded] = useState(!!defaultExpanded)
  const [editing, setEditing] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [adding, setAdding] = useState(false)

  const doneChildren = children.filter((c) => c.done).length
  const pct = children.length ? Math.round((doneChildren / children.length) * 100) : 0
  const today = todayStr()
  const tag = task.tagId ? tags.find((t) => t.id === task.tagId) : null
  const isMain = depth === 0

  // 可关联对象 = 全部主任务 - 自己 - 自己的子孙
  const banned = descendantIds(task.id, allTasks)
  const linkable = allTasks.filter((t) => !t.parentTaskId && t.id !== task.id && !banned.has(t.id))

  const pad = { paddingLeft: `${depth * 22}px` }

  return (
    <>
      <div
        onClick={() => onSelect(task.id === selectedId ? null : task.id)}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY }) }}
        style={depth > 0 ? pad : undefined}
        className={`task-item group flex items-center gap-2.5 ${isMain ? 'px-3 py-2.5' : 'py-1.5 pr-3'} rounded-lg cursor-pointer
          ${selectedId === task.id ? 'bg-haruto-sea/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
      >
        {/* 展开三角（无子任务时空占位） */}
        {children.length > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
            className={`w-5 h-5 grid place-items-center rounded text-neutral-400 hover:bg-black/10 dark:hover:bg-white/10 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            title={expanded ? '收起子任务' : '展开子任务'}
          >
            <IconChevron open={expanded} />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <input
          type="checkbox"
          checked={task.done}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdate(task.id, { done: e.target.checked })}
          className={`accent-haruto-sea shrink-0 ${isMain ? 'w-4 h-4' : 'w-3.5 h-3.5'}`}
        />
        {task.priority && task.priority !== 'none' && (
          <span className={`rounded-full shrink-0 ${isMain ? 'w-2 h-2' : 'w-1.5 h-1.5'} ${PRIORITY_DOT[task.priority]}`} title={`优先级：${PRIORITY_LABEL[task.priority]}`} />
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
          <span
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
            className={`flex-1 truncate ${isMain ? 'text-sm' : 'text-[13px] text-neutral-600 dark:text-neutral-300'}
              ${task.done ? 'line-through text-neutral-400' : ''}`}
          >
            {tag && <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: tag.color }} />}
            {task.title}
            {task.masterTaskId && <span className="ml-1.5 text-[10px] text-neutral-400">↗已关联</span>}
          </span>
        )}
        {task.dueDate && (
          <span className={`text-[10px] tabular-nums shrink-0 ${task.dueDate === today ? 'text-haruto-sea' : 'text-neutral-400'}`}>
            {task.dueDate.slice(5).replace('-', '/')}
          </span>
        )}
        {/* 子任务进度（仅带子任务的主任务行内显示） */}
        {children.length > 0 && (
          <span className="text-[10px] text-neutral-400 tabular-nums shrink-0">{doneChildren}/{children.length}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onPomodoro(task) }}
          className="text-xs hover:scale-110 transition-transform shrink-0"
          title="开始专注（任意层级可独立计时）"
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

      {/* 子任务进度条（主任务行下方） */}
      {isMain && children.length > 0 && (
        <div className="ml-10 mr-3 mt-0.5 mb-1 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: tag?.color ?? '#3d7ea6' }} />
          </div>
        </div>
      )}

      {/* 行内添加子任务输入（右键菜单"添加子任务"触发） */}
      {adding && (
        <div style={{ paddingLeft: `${(depth + 1) * 22 + 40}px` }} className="py-1 pr-3">
          <input
            autoFocus
            placeholder="新子任务标题，回车保存（Esc 取消）"
            className="w-full text-[13px] rounded-lg border border-dashed border-haruto-sea/50
              bg-transparent px-3 py-1.5 outline-none focus:border-haruto-sea"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                onAdd(e.currentTarget.value.trim(), task.id)
                e.currentTarget.value = ''
                setExpanded(true)
              }
              if (e.key === 'Escape') setAdding(false)
            }}
            onBlur={() => setAdding(false)}
          />
        </div>
      )}

      {/* 递归渲染子任务 */}
      {expanded && children.map((c) => (
        <TaskNode key={c.id} {...props} task={c} depth={depth + 1} />
      ))}

      {menu && (
        <FloatingMenu
          x={menu.x}
          y={menu.y}
          entries={buildMenu({ task, tags, linkable, onUpdate, onDelete, onPomodoro, onAddSub: () => setAdding(true) })}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  )
}

/* ============ 今日页 ============ */
export default function Today(props: {
  tasks: Task[]
  tags: Tag[]
  onAdd: (title: string, dueDate: string | null, tagId: string | null) => void
  onAddSub: (title: string, parentId: string) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  onPomodoro: (t: Task) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { tasks, tags, onAdd, onAddSub, onUpdate, onDelete, onPomodoro, selectedId, onSelect } = props
  const today = todayStr()
  const mainTasks = tasks.filter((t) => !t.parentTaskId)
  const todayMain = mainTasks.filter((t) => t.dueDate === today || t.isPinnedToday)
  const pinned = todayMain.filter((t) => t.isPinnedToday && t.dueDate !== today)
  const normal = todayMain.filter((t) => !pinned.includes(t))
  const week = ['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()]

  const nodeProps = { allTasks: tasks, tags, onUpdate, onDelete, onAdd: onAddSub, onPomodoro, selectedId, onSelect }

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

      {[
        { label: `已置顶 ${pinned.length}`, list: pinned, showEmpty: false },
        { label: `待办 ${normal.filter((t) => !t.done).length}`, list: normal.filter((t) => !t.done), showEmpty: true },
        { label: `已完成 ${todayMain.filter((t) => t.done).length}`, list: todayMain.filter((t) => t.done), showEmpty: false },
      ].map((g) =>
        g.list.length || g.showEmpty ? (
          <div key={g.label} className="mt-6">
            <div className="text-xs font-medium text-neutral-400 mb-2">{g.label}</div>
            {g.list.map((t) => (
              <TaskNode key={t.id} task={t} depth={0} {...nodeProps} />
            ))}
            {!g.list.length && <div className="text-sm text-neutral-300 dark:text-neutral-600 py-4">空空如也</div>}
          </div>
        ) : null,
      )}
    </div>
  )
}
