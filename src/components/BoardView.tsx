// 看板视图（四层结构 Step 3-5a）：
// 视图A = H1 总览：该 H1 下所有 H2 平铺横滚，H2 之间浅色竖线分隔，H2 内 Section 横向排列；
// 视图B = H2 单标签：只渲染该 H2 的 Section 横排，顶部 H2 名称（emoji+色点）。
// 任务卡片：勾选完成原位灰显（聚合才进折叠区）/ 左键悬空详情弹窗（全局互斥，日期行+提醒、文本/检查事项切换、
//   检查事项增删改勾+事项级提醒）/ 右键七项菜单（优先级▸/添加子任务/关联主任务占位/置顶今日/标签▸/移动到▸/开始专注）；
//   排序：优先级(高>中>低>无) → dueDate 升序（无日期同优先级末尾）→ 新任务在前；子任务嵌套+折叠（默认显示第一个）。
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ChecklistItem, SubTag, Section, Task, FocusSession, Tag } from '../types'
import { IconBell, IconChat, IconChevron, IconClock } from './icons'
import FloatingMenu, { type MenuEntry } from './FloatingMenu'

/* ---------- 排序：优先级(高>中>低>无) → dueDate 升序（无日期同优先级末尾）→ 无日期里新任务最上 ---------- */
export type Priority = 'none' | 'low' | 'mid' | 'high'
const PRIO_W: Record<Priority, number> = { high: 0, mid: 1, low: 2, none: 3 }
const PRIO_META: { v: Priority; label: string; color: string }[] = [
  { v: 'high', label: '高', color: '#ef4444' },
  { v: 'mid', label: '中', color: '#f59e0b' },
  { v: 'low', label: '低', color: '#3b82f6' },
  { v: 'none', label: '无', color: '#9ca3af' },
]
const PRIO_COLOR: Record<Priority, string | null> = { high: '#ef4444', mid: '#f59e0b', low: '#3b82f6', none: null }

export function boardSort(a: Task, b: Task) {
  // 修正1：日期优先——都有日期且不同 → 日期升序；同日期/都无日期 → 优先级 → 新任务在前；有 vs 无 → 有日期在前
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  const pw = PRIO_W[(a.priority ?? 'none') as Priority] - PRIO_W[(b.priority ?? 'none') as Priority]
  if (pw !== 0) return pw
  if ((a.dueDate ?? '') !== (b.dueDate ?? '')) return a.dueDate ? -1 : 1
  return b.createdAt.localeCompare(a.createdAt) // 新任务在前
}

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const pad2 = (n: number) => String(n).padStart(2, '0')

const prioDot = (color: string) => (
  <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
)
const withCheck = (node: ReactNode, active: boolean) => (
  <span className="flex w-full items-center gap-2">
    {node}
    {active && <span className="ml-auto text-[10px] text-neutral-400">✓</span>}
  </span>
)

/* ---------- 小时滚轮（00:00-23:00 间隔1小时：滚动列表点选，选中高亮） ---------- */
export function HourWheel({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  return (
    <div className="h-28 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
      {Array.from({ length: 24 }, (_, h) => (
        <button
          key={h}
          type="button"
          onClick={() => onChange(h)}
          className={`w-full px-3 py-1 text-center text-xs tabular-nums transition-colors ${
            h === value
              ? 'bg-haruto-sea/15 font-medium text-haruto-sea'
              : 'text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          {pad2(h)}:00
        </button>
      ))}
    </div>
  )
}

/* ---------- 日期步进器（‹ 日期 ›，自定义提醒选日期用，修正3） ---------- */
export function DayStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const step = (n: number) => {
    const [y, m, d] = value.split('-').map(Number)
    const dt = new Date(y, m - 1, d + n)
    onChange(`${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`)
  }
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => step(-1)} className="px-1 text-sm text-neutral-400 hover:text-haruto-sea">‹</button>
      <span className="text-xs font-medium text-neutral-600 tabular-nums dark:text-neutral-300">{value}</span>
      <button type="button" onClick={() => step(1)} className="px-1 text-sm text-neutral-400 hover:text-haruto-sea">›</button>
    </div>
  )
}

/* ---------- 事项级提醒选择（居中小卡）：提前天数 + 小时滚轮 → remindAt ISO ---------- */
export function RemindPicker({ onSave, onCancel }: { onSave: (iso: string) => void; onCancel: () => void }) {
  const [days, setDays] = useState<number | 'custom'>(0)
  const [custom, setCustom] = useState('')
  const [customDate, setCustomDate] = useState(localToday()) // 修正3：自定义可选日期
  const [hour, setHour] = useState(9)
  const effDays = days === 'custom' ? Math.max(0, Number(custom) || 0) : days
  const confirm = () => {
    const base = new Date()
    if (days === 'custom') {
      const [y, m, d] = customDate.split('-').map(Number)
      base.setFullYear(y, m - 1, d)
    } else {
      base.setDate(base.getDate() + effDays)
    }
    base.setHours(hour, 0, 0, 0)
    onSave(base.toISOString())
  }
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/30" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="w-64 rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800">
        <div className="mb-2 text-xs font-semibold">提醒时间</div>
        <div className="flex flex-wrap gap-1">
          {([0, 1, 3, 7] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                days === d ? 'border-haruto-sea bg-haruto-sea/10 text-haruto-sea' : 'border-neutral-200 text-neutral-500 dark:border-neutral-600'
              }`}
            >
              {d === 0 ? '当天' : `提前${d}天`}
            </button>
          ))}
          <input
            value={days === 'custom' ? custom : ''}
            onChange={(e) => {
              setDays('custom')
              setCustom(e.target.value)
            }}
            onFocus={() => setDays('custom')}
            type="number"
            min={0}
            placeholder="自定义"
            className="w-14 rounded-full border border-neutral-200 bg-transparent px-2 py-0.5 text-[10px] text-center outline-none focus:border-haruto-sea dark:border-neutral-600"
          />
        </div>
        {/* 修正3：自定义时可选日期（默认今天） */}
        {days === 'custom' && (
          <div className="mt-2 flex items-center gap-2">
            <span className="w-10 shrink-0 text-[10px] text-neutral-400">日期</span>
            <DayStepper value={customDate} onChange={setCustomDate} />
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <HourWheel value={hour} onChange={setHour} />
          </div>
          <div className="text-sm font-medium text-haruto-sea tabular-nums">{pad2(hour)}:00</div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
            取消
          </button>
          <button onClick={confirm} className="rounded-lg bg-haruto-sea px-3 py-1 text-xs font-medium text-white hover:opacity-90">
            确认
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- 任务日期选择器（居中 modal）：月历点选 + 提醒（提前天数 + 小时滚轮）；泛化初始值供列表视图复用 ---------- */
export function DatePickerModal({
  initialDueDate,
  initialRemindAt,
  initialRemindDays,
  onSave,
  onCancel,
}: {
  initialDueDate: string | null
  initialRemindAt: string | null
  initialRemindDays: number | null
  onSave: (dueDate: string | null, remindAt: string | null, remindDaysBefore: number | null) => void
  onCancel: () => void
}) {
  const now = new Date()
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [selected, setSelected] = useState<string | null>(initialDueDate)
  const [remindHour, setRemindHour] = useState(9)
  const [remindChoice, setRemindChoice] = useState<number | 'custom' | undefined>(undefined) // undefined = 未动（保留原值）
  // 修正3：自定义提醒可选日期——默认任务 dueDate 的前一天（无日期则今天）
  const [customDate, setCustomDate] = useState(() => {
    if (initialDueDate) {
      const [y, m, d] = initialDueDate.split('-').map(Number)
      const dt = new Date(y, m - 1, d - 1)
      return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
    }
    return localToday()
  })
  const diffDays = (a: string, b: string) => Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000)

  const first = new Date(view.y, view.m, 1)
  const cells = Array.from({ length: 42 }, (_, i) => new Date(view.y, view.m, 1 - first.getDay() + i))
  const today = localToday()
  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const confirm = () => {
    if (!selected) {
      onSave(null, null, null) // 再点已选日期取消后确认 = 清除日期与提醒
      return
    }
    if (remindChoice !== undefined && selected) {
      const [y, m, d] = selected.split('-').map(Number)
      let base: Date
      let days: number
      if (remindChoice === 'custom') {
        // 修正3：自定义 = 所选提醒日期的所选时刻；提前天数 = 任务日期 − 提醒日期（负数钳 0）
        const [cy, cm, cd] = customDate.split('-').map(Number)
        base = new Date(cy, cm - 1, cd, remindHour, 0, 0)
        days = Math.max(0, diffDays(selected, customDate))
      } else {
        days = remindChoice
        base = new Date(y, m - 1, d - days, remindHour, 0, 0)
      }
      onSave(selected, base.toISOString(), days)
    } else {
      onSave(selected, initialRemindAt ?? null, initialRemindDays ?? null)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/30" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="w-80 rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex items-center justify-between">
          <button onClick={() => shiftMonth(-1)} className="px-2 py-0.5 text-sm text-neutral-400 hover:text-haruto-sea">«</button>
          <span className="text-sm font-semibold tabular-nums">{view.y}年{view.m + 1}月</span>
          <button onClick={() => shiftMonth(1)} className="px-2 py-0.5 text-sm text-neutral-400 hover:text-haruto-sea">»</button>
        </div>
        <div className="mt-2 grid grid-cols-7 text-center text-[10px] text-neutral-400">
          {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
            <span key={w} className="py-1">{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) => {
            const ds = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
            const inMonth = d.getMonth() === view.m
            const isSel = selected === ds
            const isToday = ds === today
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(isSel ? null : ds)}
                className={`grid h-8 place-items-center rounded-lg text-xs tabular-nums transition-colors
                  ${isSel
                    ? 'bg-haruto-sea font-bold text-white'
                    : isToday
                      ? 'bg-haruto-sea/10 font-medium text-haruto-sea'
                      : inMonth
                        ? 'text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10'
                        : 'text-neutral-300 dark:text-neutral-600'}`}
              >
                {d.getDate()}
              </button>
            )
          })}
        </div>

        {/* 设置时间（提醒时刻）+ 让 ta 提醒（提前天数） */}
        <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-700/60">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-neutral-500">设置时间</span>
            <span className="text-xs font-medium text-haruto-sea tabular-nums">{pad2(remindHour)}:00</span>
          </div>
          <div className="mt-2 flex items-start gap-2">
            <span className="w-16 shrink-0 pt-1 text-xs text-neutral-500">让 ta 提醒</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1">
                {([0, 1, 3, 7] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setRemindChoice(remindChoice === d ? undefined : d)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors
                      ${remindChoice === d ? 'border-haruto-sea bg-haruto-sea/10 text-haruto-sea' : 'border-neutral-200 text-neutral-500 dark:border-neutral-600'}`}
                  >
                    {d === 0 ? '当天' : `提前${d}天`}
                  </button>
                ))}
                <input
                  onFocus={() => setRemindChoice('custom')}
                  onClick={() => setRemindChoice('custom')}
                  type="number"
                  min={0}
                  placeholder="自定义"
                  className="w-14 rounded-full border border-neutral-200 bg-transparent px-2 py-0.5 text-[10px] text-center outline-none focus:border-haruto-sea dark:border-neutral-600"
                />
              </div>
              {(remindChoice === 0 || remindChoice === 1 || remindChoice === 3 || remindChoice === 7 || remindChoice === 'custom') && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <HourWheel value={remindHour} onChange={setRemindHour} />
                  </div>
                  <div className="shrink-0 text-xs text-neutral-400 tabular-nums">
                    {remindChoice === 'custom' ? (
                      <DayStepper value={customDate} onChange={setCustomDate} />
                    ) : (
                      <>提前 {remindChoice} 天 · {pad2(remindHour)}:00</>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 dark:border-neutral-600">
            取消
          </button>
          <button onClick={confirm} className="rounded-lg bg-haruto-sea px-4 py-1.5 text-xs font-medium text-white hover:opacity-90">
            确认
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- 任务卡片回调束（App 下发，SectionColumn 透传给每张卡片） ---------- */
export interface CardBundle {
  minutesOf: (id: string) => number
  aiName: string
  tags: Tag[]
  subTags: SubTag[]
  sections: Section[]
  // 悬空弹窗全局互斥（同一时刻只有一张卡片弹窗）
  activePopupId: string | null
  onRequestPopup: (id: string) => void
  onClosePopup: () => void
  onToggleDone: (id: string) => void
  onToggleChecklist: (taskId: string, itemId: string) => void
  onAddChecklistItem: (taskId: string, text: string) => void
  onUpdateChecklistItem: (taskId: string, itemId: string, patch: Partial<ChecklistItem>) => void
  onDeleteChecklistItem: (taskId: string, itemId: string) => void
  onSetTaskReminder: (id: string, remindAt: string | null, remindDaysBefore: number | null) => void
  onUpdateTaskDue: (id: string, dueDate: string | null) => void
  onAddSubtask: (parentId: string, title: string) => void
  onUpdateTag: (id: string, tagId: string | null) => void
  onUpdateTaskSection: (id: string, sectionId: string | null) => void
  onTogglePinned: (id: string) => void
  onSetPriority: (id: string, p: Priority) => void
  onPomodoro: (t: Task) => void
  onDeleteTaskRecursive: (id: string) => void // 修正2：递归删除任务及子孙
  onOpenSubTag: (subTagId: string) => void // 修正4：点击 H2 归属跳转看板视图
}

/* ---------- 右键七项菜单构建器（看板卡片与今日/最近7天列表卡片共用） ---------- */
export function buildTaskContextMenu(
  task: Task,
  d: {
    tags: Tag[]
    subTags: SubTag[]
    sections: Section[]
    onRequestAddSubtask: () => void
    onSetPriority: (id: string, p: Priority) => void
    onTogglePinned: (id: string) => void
    onUpdateTag: (id: string, tagId: string | null) => void
    onUpdateTaskSection: (id: string, sectionId: string | null) => void
    onPomodoro: (t: Task) => void
    onDeleteRequest: () => void
    // 提供时把「关联主任务」占位换成真实关联子菜单（旧任务列表页用，时长归并逻辑在调用方）
    masterLink?: {
      linkable: Task[]
      onLink: (masterId: string) => void
      onUnlink: () => void
    }
  }
): MenuEntry[] {
  const byOrder = (a: { isPinned: boolean; order: number }, b: { isPinned: boolean; order: number }) =>
    a.isPinned === b.isPinned ? a.order - b.order : a.isPinned ? -1 : 1
  const byPinned = (a: Tag, b: Tag) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
  const h2Label = (st: SubTag) => (st.emoji ? `${st.emoji} ` : '') + st.name
  const prio = (task.priority ?? 'none') as Priority

  const sectionEntry = (sec: Section): MenuEntry => ({
    label: withCheck(sec.name, task.sectionId === sec.id),
    onClick: () => d.onUpdateTaskSection(task.id, sec.id),
  })
  const h2MoveEntry = (st: SubTag): MenuEntry => {
    const secs = d.sections.filter((s) => s.subTagId === st.id).sort((a, b) => a.order - b.order)
    return { label: h2Label(st), submenu: secs.length ? secs.map(sectionEntry) : [{ label: '（暂无分组）' }] }
  }
  const moveEntries: MenuEntry[] = [...d.tags]
    .sort(byPinned)
    .map((h1) => ({ label: h1.name, submenu: d.subTags.filter((st) => st.h1TagId === h1.id).sort(byOrder).map(h2MoveEntry) }))
  const orphanH2s = d.subTags.filter((st) => st.h1TagId === '').sort(byOrder)
  if (orphanH2s.length) moveEntries.push({ label: '未分组', submenu: orphanH2s.map(h2MoveEntry) })

  return [
    {
      label: '设置优先级',
      submenu: PRIO_META.map((p) => ({
        label: withCheck(
          <span className="flex items-center gap-2">
            {prioDot(p.color)}
            {p.label}
          </span>,
          prio === p.v
        ),
        onClick: () => d.onSetPriority(task.id, p.v),
      })),
    },
    { label: '添加子任务', onClick: d.onRequestAddSubtask },
    {
      label: d.masterLink ? '关联主任务' : '关联主任务（Step 6 开放）',
      submenu: d.masterLink
        ? [
            ...d.masterLink.linkable.slice(0, 8).map((m) => ({
              label: withCheck(`→ ${m.title}`, task.masterTaskId === m.id),
              onClick: () => d.masterLink!.onLink(m.id),
            })),
            ...(task.masterTaskId ? [{ label: '取消关联', onClick: () => d.masterLink!.onUnlink() }] : []),
          ]
        : undefined, // 占位：无 submenu 无 onClick，点击仅关闭菜单
    },
    { label: withCheck('置顶今日', !!task.isPinnedToday), onClick: () => d.onTogglePinned(task.id) },
    {
      label: '标签',
      submenu: d.subTags.length
        ? [...d.subTags].sort(byOrder).map((st) => ({
            label: withCheck(h2Label(st), task.tagId === st.id),
            onClick: () => d.onUpdateTag(task.id, st.id),
          }))
        : [{ label: '（暂无标签）' }],
    },
    { label: '移动到', submenu: moveEntries },
    { label: '🍅 开始专注', onClick: () => d.onPomodoro(task) },
    { label: '删除', danger: true, onClick: d.onDeleteRequest },
  ]
}

/* ---------- 检查事项行（悬空弹窗与右栏详情共用）：勾选 + 点击行内编辑 + 闹钟提醒 + 删除 ---------- */
export function ChecklistRow({
  item,
  onToggle,
  onUpdate,
  onDelete,
  onRemind,
}: {
  item: ChecklistItem
  onToggle: () => void
  onUpdate: (patch: Partial<ChecklistItem>) => void
  onDelete: () => void
  onRemind: () => void
}) {
  const [editing, setEditing] = useState(false)
  return (
    <div className="group flex items-center gap-2 rounded px-0.5 py-0.5 hover:bg-black/[0.03] dark:hover:bg-white/5">
      <input type="checkbox" checked={item.done} onChange={onToggle} className="h-4 w-4 shrink-0 accent-haruto-sea" />
      {editing ? (
        <input
          autoFocus
          defaultValue={item.text}
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v) onUpdate({ text: v })
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="min-w-0 flex-1 border-b border-haruto-sea bg-transparent text-xs outline-none"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`min-w-0 flex-1 cursor-text text-xs ${item.done ? 'text-neutral-400 line-through' : 'text-neutral-600 dark:text-neutral-300'}`}
        >
          {item.text}
        </span>
      )}
      <button
        onClick={onRemind}
        title={item.remindAt ? `已设提醒 ${new Date(item.remindAt).toLocaleString()}` : '设置提醒'}
        className={`shrink-0 transition-colors ${
          item.remindAt ? 'text-[#5b8c5a]' : 'text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-haruto-sea dark:text-neutral-600'
        }`}
      >
        <span className="[&>svg]:h-3 [&>svg]:w-3">
          <IconBell />
        </span>
      </button>
      <button
        onClick={onDelete}
        title="删除该事项"
        className="shrink-0 text-neutral-300 opacity-0 transition-colors group-hover:opacity-100 hover:text-red-500 dark:text-neutral-600"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>
  )
}

/* ---------- 检查事项添加行（弹窗/右栏共用，优化1）：回车保存并清空保持聚焦=连续添加；空行回车/Esc/失焦取消 ---------- */
export function ChecklistAddRow({
  onAdd,
  onCancel,
}: {
  onAdd: (text: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  return (
    <input
      ref={inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const v = text.trim()
          if (v) {
            onAdd(v)
            setText('') // 清空但不关闭：下一行立即可输入（连续添加）
          } else {
            onCancel()
          }
        }
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => {
        if (!text.trim()) onCancel()
        else {
          onAdd(text.trim())
          onCancel()
        }
      }}
      placeholder="事项内容，回车连续添加，Esc 结束"
      className="w-full rounded-lg border border-dashed border-haruto-sea/50 bg-transparent px-2 py-1 text-xs outline-none focus:border-haruto-sea"
    />
  )
}

/* ---------- 任务卡片：勾选框 + 优先级点 + 折叠三角 + meta + 悬空弹窗 + 右键菜单 ---------- */
function TaskCard({
  task,
  columnTasks,
  depth,
  seen,
  minutesOf,
  aiName,
  tags,
  subTags,
  sections,
  activePopupId,
  onRequestPopup,
  onClosePopup,
  onToggleDone,
  onToggleChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onSetTaskReminder,
  onUpdateTaskDue,
  onAddSubtask,
  onUpdateTag,
  onUpdateTaskSection,
  onTogglePinned,
  onSetPriority,
  onPomodoro,
  onDeleteTaskRecursive,
  onOpenSubTag,
}: { task: Task; columnTasks: Task[]; depth: number; seen: Set<string> } & CardBundle) {
  const cardRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pop, setPop] = useState<{ x: number; y: number } | null>(null) // 本卡弹窗坐标（每次打开按自身 rect 现场算）
  const [tab, setTab] = useState<'text' | 'checklist'>('text')
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [subInput, setSubInput] = useState(false)
  const [expanded, setExpanded] = useState(false) // 子任务折叠：默认只显示第一个
  const [addingItem, setAddingItem] = useState(false) // ＋添加 事项输入框
  const [remindFor, setRemindFor] = useState<string | null>(null) // 事项级提醒 picker
  const [dateOpen, setDateOpen] = useState(false) // 日期选择 modal
  const [confirmDelete, setConfirmDelete] = useState(false) // 修正2：删除任务确认
  const popOpen = activePopupId === task.id && !!pop
  const minutes = minutesOf(task.id)
  const hasComments = task.taskComments.length > 0
  const today = localToday()
  const prio = (task.priority ?? 'none') as Priority
  const prioColor = PRIO_COLOR[prio]

  /* 子任务：本列内 parentTaskId 指向本卡的任务（seen 防环）；折叠时只显示第一个 */
  const children = columnTasks.filter((t) => t.parentTaskId === task.id && !seen.has(t.id))
  const childSeen = (id: string) => new Set([...seen, id])
  const visibleChildren = expanded ? children : children.slice(0, 1)

  /* Bug1 修复：弹窗坐标基于本卡 rect 现场计算；显示由全局 activePopupId 互斥（开新关旧） */
  const openPopup = () => {
    const r = cardRef.current?.getBoundingClientRect()
    if (!r) return
    const W = 380
    const H = 320
    let x = r.right + 8
    if (x + W > window.innerWidth - 8) x = Math.max(8, r.left - W - 8)
    const y = Math.max(8, Math.min(r.top - 4, window.innerHeight - H - 8))
    setPop({ x, y })
    onRequestPopup(task.id) // BoardView 全局只保留一个
  }

  useEffect(() => {
    if (!popOpen) return
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClosePopup()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClosePopup()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [popOpen, onClosePopup])

  /* 右键七项菜单（构建器已提取导出，列表视图卡片复用） */
  const menuEntries = buildTaskContextMenu(task, {
    tags,
    subTags,
    sections,
    onRequestAddSubtask: () => setSubInput(true),
    onSetPriority,
    onTogglePinned,
    onUpdateTag,
    onUpdateTaskSection,
    onPomodoro,
    onDeleteRequest: () => setConfirmDelete(true),
  })

  return (
    <div
      ref={cardRef}
      onClick={openPopup}
      onContextMenu={(e) => {
        e.preventDefault()
        setMenu({ x: e.clientX, y: e.clientY })
      }}
      title={task.title}
      className="cursor-pointer rounded-lg border border-neutral-200/80 bg-white px-2.5 py-2 transition-all
        hover:border-haruto-sea/50 hover:shadow-sm select-none dark:border-neutral-700/70 dark:bg-neutral-900"
    >
      <div className="flex items-start gap-2">
        {/* 勾选框：完成原位灰显（不移动），茶绿实心 + 白勾 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleDone(task.id)
          }}
          title={task.done ? '标记为未完成' : '标记为完成'}
          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border transition-colors
            ${
              task.done
                ? 'border-[#5b8c5a] bg-[#5b8c5a] text-white'
                : 'border-neutral-300 text-transparent hover:border-haruto-sea dark:border-neutral-600'
            }`}
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2.5 6 5 8.5 9.5 3.5" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            {prioColor && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: prioColor }} title={`优先级：${prio}`} />}
            <div
              className={`min-w-0 flex-1 text-[13px] leading-snug break-all ${
                task.done ? 'text-neutral-400 line-through' : 'text-neutral-700 dark:text-neutral-200'
              }`}
            >
              {task.title}
            </div>
            {/* 子任务折叠三角（无子任务不显示） */}
            {children.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded((v) => !v)
                }}
                title={expanded ? '收起子任务' : '展开子任务'}
                className="mt-0.5 shrink-0 text-neutral-400 hover:text-haruto-sea"
              >
                <IconChevron open={expanded} />
              </button>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2.5 text-[11px]">
            {task.dueDate &&
              (task.dueDate === today ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDateOpen(true)
                  }}
                  className="font-medium text-purple-500 hover:underline"
                  title="点击修改日期与提醒"
                >
                  今天
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDateOpen(true)
                  }}
                  className="tabular-nums text-neutral-600 hover:text-haruto-sea hover:underline dark:text-neutral-300"
                  title="点击修改日期与提醒"
                >
                  {task.dueDate.slice(5).replace('-', '/')}
                </button>
              ))}
            {task.remindAt && (
              <span className="flex items-center text-haruto-sea" title="已设提醒">
                <span className="[&>svg]:h-3 [&>svg]:w-3">
                  <IconBell />
                </span>
              </span>
            )}
            {task.isPinnedToday && <span className="text-[10px] text-haruto-sea">置顶</span>}
            {minutes > 0 && (
              <span className="flex items-center gap-0.5 text-neutral-400 tabular-nums" title={`已专注 ${minutes} 分钟`}>
                <span className="[&>svg]:h-3 [&>svg]:w-3">
                  <IconClock />
                </span>
                {minutes}分
              </span>
            )}
            <span
              className={`ml-auto flex items-center gap-0.5 ${hasComments ? 'text-[#6a994e]' : 'text-neutral-300 dark:text-neutral-600'}`}
              title={hasComments ? `${hasComments} 条留言` : '暂无留言'}
            >
              <span className="[&>svg]:h-3 [&>svg]:w-3">
                <IconChat />
              </span>
              {hasComments && <span className="tabular-nums">{task.taskComments.length}</span>}
            </span>
          </div>
        </div>
      </div>

      {/* 行内添加子任务（右键菜单触发，回车创建、Esc 取消） */}
      {subInput && (
        <input
          autoFocus
          placeholder="子任务标题，回车保存"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              onAddSubtask(task.id, e.currentTarget.value.trim())
              e.currentTarget.value = ''
              setSubInput(false)
              setExpanded(true) // 加了子任务顺手展开
            }
            if (e.key === 'Escape') setSubInput(false)
          }}
          className="mt-2 w-full rounded-lg border border-dashed border-haruto-sea/50 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-haruto-sea"
        />
      )}

      {/* 子任务嵌套：折叠时只显示第一个 + 「还有 N 项」；展开显示全部 */}
      {children.length > 0 && (
        <div className="mt-2 space-y-2 border-l-2 border-neutral-100 pl-2 dark:border-neutral-800">
          {visibleChildren.map((c) => (
            <TaskCard
              key={c.id}
              task={c}
              columnTasks={columnTasks}
              depth={depth + 1}
              seen={childSeen(c.id)}
              {...{
                minutesOf, aiName, tags, subTags, sections, activePopupId, onRequestPopup, onClosePopup,
                onToggleDone, onToggleChecklist, onAddChecklistItem, onUpdateChecklistItem, onDeleteChecklistItem,
                onSetTaskReminder, onUpdateTaskDue, onAddSubtask, onUpdateTag, onUpdateTaskSection,
                onTogglePinned, onSetPriority, onPomodoro, onDeleteTaskRecursive, onOpenSubTag,
              }}
            />
          ))}
          {!expanded && children.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(true)
              }}
              className="pl-1 text-[10px] text-neutral-400 transition-colors hover:text-haruto-sea"
            >
              还有 {children.length - 1} 项
            </button>
          )}
        </div>
      )}

      {/* 左键悬空详情弹窗（全局互斥；w-360 起步，min-h-200） */}
      {popOpen && pop && (
        <div
          ref={popRef}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-40 min-h-[200px] w-[360px] max-w-[480px] rounded-xl border border-neutral-200 bg-white p-4 shadow-xl
            animate-[fadeSlideIn_.12s_ease] dark:border-neutral-700 dark:bg-neutral-800"
          style={{ left: pop.x, top: pop.y }}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 text-sm font-bold leading-snug break-all">{task.title}</div>
            <div className="flex shrink-0 rounded-md bg-black/5 p-0.5 text-[10px] dark:bg-white/10">
              {(
                [
                  ['text', '文本'],
                  ['checklist', '检查事项'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setTab(v)}
                  className={`rounded px-2 py-0.5 transition-colors ${
                    tab === v ? 'bg-white text-haruto-sea shadow-sm dark:bg-neutral-700' : 'text-neutral-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 日期行：点击打开日期选择 modal */}
          <button
            onClick={() => setDateOpen(true)}
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-200 px-2 py-1 text-xs
              text-neutral-500 transition-colors hover:border-haruto-sea hover:text-haruto-sea dark:border-neutral-600"
          >
            {task.dueDate ? (
              task.dueDate === today ? (
                <span className="font-medium text-purple-500">今天</span>
              ) : (
                <span className="tabular-nums text-neutral-600 dark:text-neutral-300">{task.dueDate}</span>
              )
            ) : (
              <span>添加日期</span>
            )}
            {task.remindAt && (
              <span className="text-haruto-sea" title="已设提醒">
                <span className="[&>svg]:h-3 [&>svg]:w-3">
                  <IconBell />
                </span>
              </span>
            )}
          </button>

          <div className="mt-3">
            {tab === 'text' ? (
              task.description ? (
                <p className="text-xs leading-relaxed break-all whitespace-pre-wrap text-neutral-600 dark:text-neutral-300">
                  {task.description}
                </p>
              ) : (
                <p className="text-xs text-neutral-300 dark:text-neutral-600">暂无描述</p>
              )
            ) : (
              <>
                {/* 检查事项模式：描述 → 分隔线 → 标题+添加 → 列表 */}
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {task.description || <span className="text-neutral-300 dark:text-neutral-600">暂无描述</span>}
                </p>
                <div className="mt-2 border-t border-neutral-100 pt-2 dark:border-neutral-700/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">检查事项</span>
                    <button
                      onClick={() => setAddingItem(true)}
                      className="text-[10px] text-haruto-sea transition-colors hover:opacity-75"
                    >
                      + 添加
                    </button>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {task.checklistItems.map((c) => (
                      <ChecklistRow
                        key={c.id}
                        item={c}
                        onToggle={() => onToggleChecklist(task.id, c.id)}
                        onUpdate={(patch) => onUpdateChecklistItem(task.id, c.id, patch)}
                        onDelete={() => onDeleteChecklistItem(task.id, c.id)}
                        onRemind={() => setRemindFor(c.id)}
                      />
                    ))}
                    {addingItem && (
                      <ChecklistAddRow
                        onAdd={(t) => onAddChecklistItem(task.id, t)}
                        onCancel={() => setAddingItem(false)}
                      />
                    )}
                    {task.checklistItems.length === 0 && !addingItem && (
                      <p className="py-1 text-xs text-neutral-300 dark:text-neutral-600">暂无检查事项</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* AI 留言入口（M6 上线后显示留言；当前只读占位） */}
          <div className="mt-3 border-t border-neutral-100 pt-2 dark:border-neutral-700/60">
            <div className="flex items-center gap-1.5 text-[#6a994e]">
              <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">
                <IconChat />
              </span>
              <span className="text-xs font-medium">{aiName} 的留言</span>
            </div>
            <div className="mt-1 text-xs italic text-haruto-sea/60">暂无留言</div>
          </div>
        </div>
      )}

      {/* 右键七项菜单 */}
      {menu && <FloatingMenu x={menu.x} y={menu.y} entries={menuEntries} onClose={() => setMenu(null)} />}

      {/* 事项级提醒 picker */}
      {remindFor && (
        <RemindPicker
          onSave={(iso) => {
            onUpdateChecklistItem(task.id, remindFor, { remindAt: iso })
            setRemindFor(null)
          }}
          onCancel={() => setRemindFor(null)}
        />
      )}

      {/* 日期选择 modal */}
      {dateOpen && (
        <DatePickerModal
          initialDueDate={task.dueDate}
          initialRemindAt={task.remindAt ?? null}
          initialRemindDays={task.remindDaysBefore ?? null}
          onSave={(dueDate, remindAt, remindDaysBefore) => {
            onUpdateTaskDue(task.id, dueDate)
            onSetTaskReminder(task.id, remindAt, remindDaysBefore)
            setDateOpen(false)
          }}
          onCancel={() => setDateOpen(false)}
        />
      )}

      {/* 修正2：删除任务确认（递归删子孙） */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/30 animate-[fadeSlideIn_.15s_ease]"
          onMouseDown={(e) => e.target === e.currentTarget && setConfirmDelete(false)}
        >
          <div className="w-72 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800">
            <div className="text-sm font-semibold select-none">删除该任务及其所有子任务？</div>
            <div className="mt-1 text-xs text-neutral-400 select-none">{task.title}</div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  onDeleteTaskRecursive(task.id)
                  setConfirmDelete(false)
                }}
                className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-medium text-white transition-opacity select-none hover:opacity-90"
              >
                确认删除
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg border border-neutral-200 py-2 text-xs text-neutral-500 transition-colors select-none hover:text-neutral-700 dark:border-neutral-600 dark:hover:text-neutral-200"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Section 列：列头（重命名/＋新建任务/⋯六项菜单）+ 任务堆叠 + 已完成折叠区 + 删除确认 ---------- */
function SectionColumn({
  section,
  tasks,
  card,
  renaming,
  onRequestRename,
  onRenameCommit,
  onRenameCancel,
  onAddTaskToSection,
  onInsertSection,
  onMoveSection,
  onDeleteSection,
  onAggregateDone,
}: {
  section: Section
  tasks: Task[] // 本列全部任务（含子任务，父任务嵌套渲染子任务）
  card: CardBundle
  renaming: boolean
  onRequestRename: (id: string) => void
  onRenameCommit: (id: string, name: string) => void
  onRenameCancel: () => void
  onAddTaskToSection: (sectionId: string, title: string) => void
  onInsertSection: (sectionId: string, side: 'left' | 'right') => void
  onMoveSection: (sectionId: string, newSubTagId: string) => void
  onDeleteSection: (sectionId: string) => void
  onAggregateDone: (sectionId: string) => void
}) {
  const [doneOpen, setDoneOpen] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  /* 分区语义：勾选完成不移位——堆叠区 = 未完成 + 已完成但未被聚合的任务（原位灰显）；
     折叠区 = 已被用户「聚合」的完成任务。子任务永远嵌套跟随父卡 */
  const stack = tasks.filter((t) => !t.done || !t.aggregated).sort(boardSort)
  const folded = tasks.filter((t) => t.done && t.aggregated)
  const stackIds = new Set(stack.map((t) => t.id))
  const foldedIds = new Set(folded.map((t) => t.id))
  const stackRoots = stack.filter((t) => !t.parentTaskId || !stackIds.has(t.parentTaskId))
  const foldedRoots = folded.filter((t) => !t.parentTaskId || !foldedIds.has(t.parentTaskId))

  /* ⋯ 菜单：移动到… 用二级子菜单展示 H1 → H2 树 */
  const byOrder = (a: { isPinned: boolean; order: number }, b: { isPinned: boolean; order: number }) =>
    a.isPinned === b.isPinned ? a.order - b.order : a.isPinned ? -1 : 1
  const byPinned = (a: Tag, b: Tag) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
  const h2Entry = (st: SubTag): MenuEntry => ({
    label: (st.emoji ? `${st.emoji} ` : '') + st.name,
    onClick: () => onMoveSection(section.id, st.id),
  })
  const moveEntries: MenuEntry[] = [...card.tags]
    .sort(byPinned)
    .map((h1) => ({ label: h1.name, submenu: card.subTags.filter((st) => st.h1TagId === h1.id).sort(byOrder).map(h2Entry) }))
  const orphanH2s = card.subTags.filter((st) => st.h1TagId === '').sort(byOrder)
  if (orphanH2s.length) moveEntries.push({ label: '未分组', submenu: orphanH2s.map(h2Entry) })

  const menuEntries: MenuEntry[] = [
    { label: '重命名', onClick: () => onRequestRename(section.id) },
    { label: '在左侧添加分组', onClick: () => onInsertSection(section.id, 'left') },
    { label: '在右侧添加分组', onClick: () => onInsertSection(section.id, 'right') },
    { label: '移动到…', submenu: moveEntries },
    // 数据标记：把组内所有 done 任务标记为已聚合，折叠区随即显示（配合展开）
    { label: '聚合该组下已完成任务', onClick: () => { onAggregateDone(section.id); setDoneOpen(true) } },
    { label: '删除', danger: true, onClick: () => setConfirmDelete(true) },
  ]

  return (
    <div className="flex w-[260px] shrink-0 flex-col">
      <div className="flex items-center gap-1 px-1 pb-2">
        {renaming ? (
          <input
            autoFocus
            defaultValue={section.name}
            onBlur={onRenameCancel}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameCommit(section.id, e.currentTarget.value.trim())
              if (e.key === 'Escape') onRenameCancel()
            }}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded-md border border-haruto-sea bg-transparent px-1.5 py-0.5 text-sm font-bold outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-neutral-700 dark:text-neutral-200">{section.name}</span>
        )}
        <button
          onClick={() => setAddingTask((v) => !v)}
          title="新建任务"
          className={`grid h-6 w-6 place-items-center rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10
            ${addingTask ? 'text-haruto-sea' : 'text-neutral-400 hover:text-haruto-sea'}`}
        >
          ＋
        </button>
        <button
          onClick={(e) => setMenu({ x: e.clientX, y: e.clientY })}
          title="分组操作"
          className="grid h-6 w-6 place-items-center rounded-md text-neutral-400 transition-colors hover:bg-black/5 hover:text-neutral-600 dark:hover:bg-white/10 dark:hover:text-neutral-200"
        >
          ⋯
        </button>
      </div>

      {addingTask && (
        <input
          autoFocus
          placeholder="添加任务…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              onAddTaskToSection(section.id, e.currentTarget.value.trim())
              e.currentTarget.value = ''
              setAddingTask(false)
            }
            if (e.key === 'Escape') setAddingTask(false)
          }}
          className="mb-2 w-full rounded-lg border border-dashed border-haruto-sea/50 bg-transparent px-3 py-1.5 text-[13px] outline-none focus:border-haruto-sea"
        />
      )}

      <div className="min-h-[48px] space-y-2">
        {stackRoots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200/80 px-2 py-3 text-center text-xs text-neutral-300 dark:border-neutral-700/60 dark:text-neutral-600">
            暂无任务
          </div>
        ) : (
          stackRoots.map((t) => <TaskCard key={t.id} task={t} columnTasks={tasks} depth={0} seen={new Set([t.id])} {...card} />)
        )}
      </div>

      {foldedRoots.length > 0 && (
        <div className="mt-3 border-t border-neutral-200/70 pt-2 dark:border-neutral-700/60">
          <button
            onClick={() => setDoneOpen((v) => !v)}
            className="flex items-center gap-1 rounded px-1 py-0.5 text-xs text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <IconChevron open={doneOpen} />
            已完成 {foldedRoots.length}
          </button>
          {doneOpen && (
            <div className="mt-2 space-y-2">
              {foldedRoots.map((t) => (
                <TaskCard key={t.id} task={t} columnTasks={tasks} depth={0} seen={new Set([t.id])} {...card} />
              ))}
            </div>
          )}
        </div>
      )}

      {menu && <FloatingMenu x={menu.x} y={menu.y} entries={menuEntries} onClose={() => setMenu(null)} />}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/30 animate-[fadeSlideIn_.15s_ease]"
          onMouseDown={(e) => e.target === e.currentTarget && setConfirmDelete(false)}
        >
          <div className="w-72 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800">
            <div className="text-sm font-semibold select-none">删除该分组及其下所有任务？</div>
            <div className="mt-1 text-xs text-neutral-400 select-none">
              {section.name} · {tasks.length} 个任务将一并删除
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  onDeleteSection(section.id)
                  setConfirmDelete(false)
                }}
                className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-medium text-white transition-opacity select-none hover:opacity-90"
              >
                确认删除
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg border border-neutral-200 py-2 text-xs text-neutral-500 transition-colors select-none hover:text-neutral-700 dark:border-neutral-600 dark:hover:text-neutral-200"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- H2 区块头（emoji + 色点 + 名称，视图A/B 共用样式） ---------- */
function SubTagHeader({ st, large }: { st: SubTag; large?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 px-1 pb-2">
      {st.emoji ? (
        <span className="shrink-0 text-sm">{st.emoji}</span>
      ) : (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: st.color }} />
      )}
      <span className={`truncate font-bold text-neutral-800 dark:text-neutral-100 ${large ? 'text-[15px]' : 'text-sm'}`}>{st.name}</span>
    </div>
  )
}

/* ---------- H2 空分组引导 ---------- */
function EmptySectionsGuide({ subTagId, onCreate }: { subTagId: string; onCreate: (subTagId: string) => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-neutral-200/80 px-3 py-3 dark:border-neutral-700/60">
      <span className="text-xs text-neutral-300 dark:text-neutral-600">还没有分组</span>
      <button
        onClick={() => onCreate(subTagId)}
        className="rounded-lg border border-haruto-sea/40 bg-haruto-sea/5 px-2.5 py-1 text-xs text-haruto-sea transition-colors hover:border-haruto-sea hover:bg-haruto-sea/15"
      >
        ＋ 新建分组
      </button>
    </div>
  )
}

/* ---------- 看板主体回调（App 下发） ---------- */
export interface BoardCallbacks {
  tags: Tag[]
  renamingSectionId: string | null
  onRequestRename: (id: string) => void
  onRenameCommit: (id: string, name: string) => void
  onRenameCancel: () => void
  onAddTaskToSection: (sectionId: string, title: string) => void
  onInsertSection: (sectionId: string, side: 'left' | 'right') => void
  onMoveSection: (sectionId: string, newSubTagId: string) => void
  onDeleteSection: (sectionId: string) => void
  onCreateSection: (subTagId: string) => void
  onAggregateDone: (sectionId: string) => void
  // Step 5 任务卡片
  aiName: string
  onToggleDone: (id: string) => void
  onToggleChecklist: (taskId: string, itemId: string) => void
  onAddChecklistItem: (taskId: string, text: string) => void
  onUpdateChecklistItem: (taskId: string, itemId: string, patch: Partial<ChecklistItem>) => void
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
}

/* ---------- 看板主体 ---------- */
export default function BoardView({
  subTags,
  sections,
  tasks,
  focusSessions,
  tags,
  renamingSectionId,
  onRequestRename,
  onRenameCommit,
  onRenameCancel,
  onAddTaskToSection,
  onInsertSection,
  onMoveSection,
  onDeleteSection,
  onCreateSection,
  onAggregateDone,
  aiName,
  onToggleDone,
  onToggleChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onSetTaskReminder,
  onUpdateTaskDue,
  onAddSubtask,
  onUpdateTag,
  onUpdateTaskSection,
  onTogglePinned,
  onSetPriority,
  onPomodoro,
  onDeleteTaskRecursive,
  onOpenSubTag,
  h1TagId,
  activeSubTagId,
}: {
  subTags: SubTag[]
  sections: Section[]
  tasks: Task[]
  focusSessions: FocusSession[]
  h1TagId: string | null
  activeSubTagId: string | null
} & BoardCallbacks) {
  const minutesOf = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of focusSessions) m.set(s.taskId, (m.get(s.taskId) ?? 0) + s.minutes)
    return (id: string) => m.get(id) ?? 0
  }, [focusSessions])

  const byOrder = (a: { isPinned: boolean; order: number }, b: { isPinned: boolean; order: number }) =>
    a.isPinned === b.isPinned ? a.order - b.order : a.isPinned ? -1 : 1
  const sortUngrouped = (list: Task[]) => [...list].sort(boardSort)

  // 悬空弹窗全局互斥：同一时刻只有一张卡片的弹窗（Bug1 修复）
  const [activePopupId, setActivePopupId] = useState<string | null>(null)

  const card: CardBundle = {
    minutesOf,
    aiName,
    tags,
    subTags,
    sections,
    activePopupId,
    onRequestPopup: (id) => setActivePopupId(id),
    onClosePopup: () => setActivePopupId(null),
    onToggleDone,
    onToggleChecklist,
    onAddChecklistItem,
    onUpdateChecklistItem,
    onDeleteChecklistItem,
    onSetTaskReminder,
    onUpdateTaskDue,
    onAddSubtask,
    onUpdateTag,
    onUpdateTaskSection,
    onTogglePinned,
    onSetPriority,
    onPomodoro,
    onDeleteTaskRecursive,
    onOpenSubTag,
  }
  const colBase = {
    card,
    renamingSectionId,
    onRequestRename,
    onRenameCommit,
    onRenameCancel,
    onAddTaskToSection,
    onInsertSection,
    onMoveSection,
    onDeleteSection,
    onAggregateDone,
  }

  /* ===== 视图B：H2 单标签看板 ===== */
  if (activeSubTagId) {
    const st = subTags.find((s) => s.id === activeSubTagId)
    if (!st) return <div className="grid h-full place-items-center text-sm text-neutral-400">标签不存在</div>
    const secs = sections.filter((s) => s.subTagId === st.id).sort((a, b) => a.order - b.order)
    const secIds = new Set(secs.map((s) => s.id))
    const ungrouped = tasks.filter((t) => t.tagId === st.h1TagId && (!t.sectionId || !secIds.has(t.sectionId)))

    return (
      <div className="flex h-full flex-col p-5">
        <div className="mb-4 flex items-center gap-2">
          <SubTagHeader st={st} large />
          <span className="text-xs text-neutral-400 tabular-nums">{secs.length} 个分组</span>
        </div>
        <div className="flex-1 overflow-x-auto pb-2">
          <div className="flex min-w-max items-start gap-3">
            {secs.length === 0 && <EmptySectionsGuide subTagId={st.id} onCreate={onCreateSection} />}
            {secs.map((sec) => (
              <SectionColumn
                key={sec.id}
                section={sec}
                tasks={tasks.filter((t) => t.sectionId === sec.id)}
                renaming={renamingSectionId === sec.id}
                {...colBase}
              />
            ))}
          </div>
        </div>
        {ungrouped.length > 0 && (
          <div className="mt-2 border-t border-neutral-200/70 pt-3 dark:border-neutral-700/60">
            <div className="px-1 pb-2 text-xs font-bold text-neutral-400">未分组 {ungrouped.length}</div>
            <div className="flex max-w-5xl flex-wrap gap-2">
              {sortUngrouped(ungrouped)
                .filter((t) => !t.parentTaskId)
                .map((t) => (
                  <div key={t.id} className="w-[248px]">
                    <TaskCard task={t} columnTasks={ungrouped} depth={0} seen={new Set([t.id])} {...card} />
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ===== 视图A：H1 总览看板 ===== */
  const subs = subTags.filter((s) => s.h1TagId === h1TagId).sort(byOrder)
  const allSecIds = new Set(sections.filter((sec) => subs.some((st) => st.id === sec.subTagId)).map((s) => s.id))
  const inScope = tasks.filter((t) => t.tagId === h1TagId || (t.sectionId && allSecIds.has(t.sectionId)))
  const ungrouped = inScope.filter((t) => !t.sectionId || !allSecIds.has(t.sectionId))

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex-1 overflow-x-auto pb-2">
        <div className="flex min-w-max items-start">
          {subs.length === 0 && (
            <div className="rounded-lg border border-dashed border-neutral-200/80 px-4 py-6 text-sm text-neutral-300 dark:border-neutral-700/60 dark:text-neutral-600">
              该清单下还没有标签（L2 三点菜单 → 新建标签）
            </div>
          )}
          {subs.map((st, i) => {
            const secs = sections.filter((s) => s.subTagId === st.id).sort((a, b) => a.order - b.order)
            return (
              <div
                key={st.id}
                className={`flex shrink-0 items-start gap-3 ${
                  i > 0 ? 'ml-3 border-l border-neutral-200/70 pl-3 dark:border-neutral-700/60' : ''
                }`}
              >
                <div className="flex flex-col">
                  <SubTagHeader st={st} large />
                  <div className="flex flex-1 items-start gap-3">
                    {secs.length === 0 && <EmptySectionsGuide subTagId={st.id} onCreate={onCreateSection} />}
                    {secs.map((sec) => (
                      <SectionColumn
                        key={sec.id}
                        section={sec}
                        tasks={tasks.filter((t) => t.sectionId === sec.id)}
                        renaming={renamingSectionId === sec.id}
                        {...colBase}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {ungrouped.length > 0 && (
        <div className="mt-2 border-t border-neutral-200/70 pt-3 dark:border-neutral-700/60">
          <div className="px-1 pb-2 text-xs font-bold text-neutral-400">未分组 {ungrouped.length}</div>
          <div className="flex max-w-5xl flex-wrap gap-2">
            {sortUngrouped(ungrouped)
              .filter((t) => !t.parentTaskId)
              .map((t) => (
                <div key={t.id} className="w-[248px]">
                  <TaskCard task={t} columnTasks={ungrouped} depth={0} seen={new Set([t.id])} {...card} />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
