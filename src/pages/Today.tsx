// 任务树体系：无限嵌套（主任务→子任务→子子任务…），任意层级统一右键、独立计时、行内加子任务
// 今日页（Step 6 重构）：逾期/今天分组 + NewTaskBar 新建行 + ListTaskCard 列表卡片（左键选中进右栏详情）
// TaskNode 仍保留供旧版任务列表页（全部清单）使用
import { useMemo, useState } from 'react'
import type { Task, Tag } from '../types'
import FloatingMenu, { type MenuEntry } from '../components/FloatingMenu'
import { IconChevron } from '../components/icons'
import ListTaskCard from '../components/ListTaskCard'
import NewTaskBar from '../components/NewTaskBar'
import { buildTaskContextMenu, boardSort, type Priority } from '../components/BoardView'

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDaysStr(base: string, n: number) {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// 下一个周X（target: 1=一 … 5=五；今天恰为周X时返回下周X）
function nextWeekdayStr(target: number, base: string) {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const diff = (((target - dt.getDay()) % 7) + 7) % 7 || 7
  dt.setDate(dt.getDate() + diff)
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
/* ============ 递归任务节点 ============ */
export function TaskNode(props: {
  task: Task
  allTasks: Task[]
  tags: Tag[]
  subTags: import('../types').SubTag[]
  sections: import('../types').Section[]
  onDeleteTaskRecursive: (id: string) => void
  depth: number
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  onAdd: (title: string, parentId: string) => void
  onPomodoro: (t: Task) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  defaultExpanded?: boolean
  _seen?: Set<string> // 递归防环：祖先链上出现过的 id 不再展开
}) {
  const { task, allTasks, tags, depth, subTags, sections, onUpdate, onDelete, onDeleteTaskRecursive, onAdd, onPomodoro, selectedId, onSelect, defaultExpanded, _seen } = props
  const seen = _seen ?? new Set([task.id])
  const children = allTasks.filter((c) => c.parentTaskId === task.id && !seen.has(c.id))
  const [expanded, setExpanded] = useState(!!defaultExpanded)
  const [editing, setEditing] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [adding, setAdding] = useState(false)
  const [pickingDate, setPickingDate] = useState(false) // 行内日期选择（右键"选择日期…"）

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

      {/* 行内日期选择（右键 → 设置日期 → 选择日期…） */}
      {pickingDate && (
        <div style={{ paddingLeft: `${(depth + 1) * 22 + 24}px` }} className="py-1 pr-3 flex items-center gap-2">
          <input
            autoFocus
            type="date"
            defaultValue={task.dueDate ?? ''}
            onChange={(e) => {
              if (e.target.value) {
                onUpdate(task.id, { dueDate: e.target.value })
                setPickingDate(false)
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Escape') setPickingDate(false) }}
            onBlur={() => setPickingDate(false)}
            className="text-[13px] rounded-lg border border-haruto-sea/50 bg-transparent px-2 py-1 outline-none"
          />
          <span className="text-[10px] text-neutral-400">选择后自动保存，Esc 取消</span>
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

      {/* 递归渲染子任务（防环：每层把自身 id 记入祖先链） */}
      {expanded && children.map((c) => {
        const childSeen = new Set(seen)
        childSeen.add(c.id)
        return <TaskNode key={c.id} {...props} task={c} depth={depth + 1} _seen={childSeen} />
      })}

      {menu && (
        <FloatingMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          entries={(() => {
            // 修正7：与其他视图共用七项菜单构建器；保留旧版「设置日期」子菜单与真实「关联主任务」
            const entries = buildTaskContextMenu(task, {
              allTasks,
              tags,
              subTags,
              sections,
              onRequestAddSubtask: () => setAdding(true),
              onSetPriority: (id, p) => onUpdate(id, { priority: p }),
              onTogglePinned: () => onUpdate(task.id, { isPinnedToday: !task.isPinnedToday }),
              onUpdateTag: (id, tagId) => onUpdate(id, { tagId }),
              onUpdateTaskSection: (id, sectionId) => onUpdate(id, { sectionId }),
              onPomodoro,
              onSetDueDate: (id, date) => onUpdate(id, { dueDate: date }),
              onPickDate: () => setPickingDate(true),
              onDeleteRequest: () => onDeleteTaskRecursive(task.id),
              onSetMasterTask: (id, masterId) => onUpdate(id, { masterTaskId: masterId }),
            })
            entries.unshift({
              label: '设置日期',
              submenu: [
                { label: '今天', onClick: () => onUpdate(task.id, { dueDate: today }) },
                { label: '明天', onClick: () => onUpdate(task.id, { dueDate: addDaysStr(today, 1) }) },
                { label: '后天', onClick: () => onUpdate(task.id, { dueDate: addDaysStr(today, 2) }) },
                { label: '下周三', onClick: () => onUpdate(task.id, { dueDate: nextWeekdayStr(3, today) }) },
                { label: '下周五', onClick: () => onUpdate(task.id, { dueDate: nextWeekdayStr(5, today) }) },
                { label: '选择日期…', onClick: () => setPickingDate(true) },
                { label: '清除日期', onClick: () => onUpdate(task.id, { dueDate: null }) },
              ],
            })
            return entries
          })()}
        />
      )}
    </>
  )
}

/* ============ 今日页（Step 6 重构：逾期/今天分组 + 新建任务行 + 列表卡片 + 右栏详情） ============ */
export default function Today(props: {
  tasks: Task[]
  tags: Tag[]
  subTags: import('../types').SubTag[]
  sections: import('../types').Section[]
  focusSessions: import('../types').FocusSession[]
  aiName: string
  selectedId: string | null
  onSelect: (id: string | null) => void
  onAddTaskWithOptions: (title: string, opts: { dueDate?: string | null; priority?: Priority; tagId?: string | null }) => void
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
  onPomodoro: (t: Task) => void
  onDeleteTaskRecursive: (id: string) => void
  onOpenSubTag: (subTagId: string) => void
  onSetMasterTask: (id: string, masterId: string | null) => void
}) {
  const { tasks, selectedId, onSelect, onAddTaskWithOptions } = props
  const minutesOf = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of props.focusSessions) m.set(s.taskId, (m.get(s.taskId) ?? 0) + s.minutes)
    return (id: string) => m.get(id) ?? 0
  }, [props.focusSessions])

  const today = todayStr()
  const mainTasks = tasks.filter((t) => !t.parentTaskId)
  // 已逾期：今天之前到期的未完成主任务，最久远的在最上
  const overdue = mainTasks
    .filter((t) => !t.done && t.dueDate && t.dueDate < today)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  const overdueIds = new Set(overdue.map((t) => t.id))
  // 今天：今天到期 + 置顶今日（逾期的不重复出现）
  const todays = mainTasks
    .filter((t) => !t.done && !overdueIds.has(t.id) && (t.dueDate === today || t.isPinnedToday))
    .sort(boardSort)

  const cardBase = {
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
    onSetMasterTask: props.onSetMasterTask,
  }

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
              {...cardBase}
            />
          ))}
        </div>
      </div>
    ) : null

  return (
    <div className="flex h-full flex-col p-6">
      <div className="max-w-3xl">
        <h1 className="text-xl font-bold">
          今天 <span className="text-sm font-normal text-neutral-400">{today} 星期{['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()]}</span>
        </h1>
        <div className="mt-4">
          <NewTaskBar
            subTags={props.subTags}
            defaultDueDate={today}
            onAdd={(title, due, priority, tagId) => onAddTaskWithOptions(title, { dueDate: due, priority, tagId })}
          />
        </div>
      </div>
      <div className="mt-2 max-w-3xl flex-1 overflow-y-auto pb-6">
        {group('已逾期', overdue, 'danger')}
        {group('今天', todays)}
        {overdue.length === 0 && todays.length === 0 && (
          <div className="mt-10 text-center text-sm text-neutral-300 dark:text-neutral-600">
            今天没有安排，未来的任务去「最近7天」看
          </div>
        )}
      </div>
    </div>
  )
}
