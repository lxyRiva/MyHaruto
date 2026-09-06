// 右键九项菜单构建器 + 卡片回调束类型（RF-P2a 自 BoardView.tsx 原样迁入；含 JSX 故为 .tsx）
import type { ReactNode } from 'react'
import type { ChecklistItem, Section, SubTag, Tag, Task } from '../../../shared/types'
import type { MenuEntry } from '../../../shared/components/FloatingMenu'
import { localToday, pad2 } from './DateTimePickers'
import type { Priority } from '../types'

export const PRIO_META: { v: Priority; label: string; color: string }[] = [
  { v: 'high', label: '高', color: '#ef4444' },
  { v: 'mid', label: '中', color: '#f59e0b' },
  { v: 'low', label: '低', color: '#3b82f6' },
  { v: 'none', label: '无', color: '#9ca3af' },
]

export const prioDot = (color: string) => (
  <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
)

export const withCheck = (node: ReactNode, active: boolean) => (
  <span className="flex w-full items-center gap-2">
    {node}
    {active && <span className="ml-auto text-[10px] text-neutral-400">✓</span>}
  </span>
)


/* ---------- 任务卡片回调束（App 下发，SectionColumn 透传给每张卡片） ---------- */
export interface CardBundle {
  minutesOf: (id: string) => number
  allTasks: Task[]
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
  onSetMasterTask: (id: string, masterId: string | null) => void
  onPomodoro: (t: Task) => void
  onDeleteTaskRecursive: (id: string) => void // 修正2：递归删除任务及子孙
  onOpenSubTag: (subTagId: string) => void // 修正4：点击 H2 归属跳转看板视图
}


/* ---------- 右键九项菜单构建器（四视图唯一菜单源）：优先级/添加子任务/关联主任务(真实)/置顶今日/标签/移动到/设置日期/开始专注/删除 ---------- */
export function buildTaskContextMenu(
  task: Task,
  d: {
    allTasks: Task[]
    tags: Tag[]
    subTags: SubTag[]
    sections: Section[]
    onRequestAddSubtask: () => void
    onSetPriority: (id: string, p: Priority) => void
    onSetMasterTask: (id: string, masterId: string | null) => void
    onTogglePinned: (id: string) => void
    onUpdateTag: (id: string, tagId: string | null) => void
    onUpdateTaskSection: (id: string, sectionId: string | null) => void
    onSetDueDate: (id: string, date: string | null) => void
    onPickDate: () => void
    onPomodoro: (t: Task) => void
    onDeleteRequest: () => void
  }
): MenuEntry[] {
  const byOrder = (a: { isPinned: boolean; order: number }, b: { isPinned: boolean; order: number }) =>
    a.isPinned === b.isPinned ? a.order - b.order : a.isPinned ? -1 : 1
  const byPinned = (a: Tag, b: Tag) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
  const h2Label = (st: SubTag) => (st.emoji ? `${st.emoji} ` : '') + st.name
  const prio = (task.priority ?? 'none') as Priority
  const today = localToday()

  // 关联候选：全部主任务 − 自己 − 自己的子孙（防环）
  const banned = new Set<string>([task.id])
  let grew = true
  while (grew) {
    grew = false
    for (const t of d.allTasks) {
      if (t.parentTaskId && banned.has(t.parentTaskId) && !banned.has(t.id)) {
        banned.add(t.id)
        grew = true
      }
    }
  }
  const linkable = d.allTasks.filter((t) => !t.parentTaskId && !banned.has(t.id))

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
      // 任务2：真实关联（子任务的 masterTaskId 独立，均可关联）
      label: '关联主任务',
      submenu:
        linkable.length || task.masterTaskId
          ? [
              ...linkable.slice(0, 12).map((m) => ({
                label: withCheck(`→ ${m.title}`, task.masterTaskId === m.id),
                onClick: () => d.onSetMasterTask(task.id, m.id),
              })),
              ...(task.masterTaskId ? [{ label: '取消关联', onClick: () => d.onSetMasterTask(task.id, null) }] : []),
            ]
          : [{ label: '（暂无可关联的主任务）' }],
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
    {
      label: '设置日期',
      submenu: [
        { label: '今天', onClick: () => d.onSetDueDate(task.id, today) },
        { label: '明天', onClick: () => d.onSetDueDate(task.id, addDaysStr(today, 1)) },
        { label: '后天', onClick: () => d.onSetDueDate(task.id, addDaysStr(today, 2)) },
        { label: '下周三', onClick: () => d.onSetDueDate(task.id, nextWeekdayStr(3, today)) },
        { label: '下周五', onClick: () => d.onSetDueDate(task.id, nextWeekdayStr(5, today)) },
        { label: '选择日期…', onClick: d.onPickDate },
        { label: '清除日期', onClick: () => d.onSetDueDate(task.id, null) },
      ],
    },
    { label: '🍅 开始专注', onClick: () => d.onPomodoro(task) },
    { label: '删除', danger: true, onClick: d.onDeleteRequest },
  ]
}


function addDaysStr(base: string, n: number): string {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}
function nextWeekdayStr(target: number, base: string): string {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const diff = (((target - dt.getDay()) % 7) + 7) % 7 || 7
  dt.setDate(dt.getDate() + diff)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

