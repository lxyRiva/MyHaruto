// 看板任务卡片（RF-P2a 自 BoardView.tsx 原样迁入）：勾选/悬空弹窗/右键九项菜单/子任务嵌套折叠
import { useEffect, useRef, useState } from 'react'
import type { Task } from '../../../types'
import type { Priority } from '../types'
import { IconBell, IconChat, IconChevron, IconClock } from '../../../components/icons'
import FloatingMenu from '../../../components/FloatingMenu'
import { DatePickerModal, RemindPicker, localToday } from './DateTimePickers'
import { buildTaskContextMenu, type CardBundle } from './taskMenu'
import { ChecklistAddRow, ChecklistRow } from './ChecklistRow'

const PRIO_COLOR: Record<Priority, string | null> = { high: '#ef4444', mid: '#f59e0b', low: '#3b82f6', none: null }

/* ---------- 任务卡片：勾选框 + 优先级点 + 折叠三角 + meta + 悬空弹窗 + 右键菜单 ---------- */
export default function TaskCard({
  task,
  columnTasks,
  depth,
  seen,
  minutesOf,
  allTasks,
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
  onSetMasterTask,
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
  const [pickingDate, setPickingDate] = useState(false) // 行内日期选择（菜单"选择日期…"）
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
    allTasks,
    tags,
    subTags,
    sections,
    onRequestAddSubtask: () => setSubInput(true),
    onSetPriority,
    onSetMasterTask,
    onTogglePinned,
    onUpdateTag,
    onUpdateTaskSection,
    onSetDueDate: onUpdateTaskDue,
    onPickDate: () => setPickingDate(true),
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

      {/* 行内日期选择（菜单"选择日期…"触发，选完即存） */}
      {pickingDate && (
        <input
          autoFocus
          type="date"
          defaultValue={task.dueDate ?? ''}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            onUpdateTaskDue(task.id, e.target.value || null)
            setPickingDate(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setPickingDate(false)
          }}
          onBlur={() => setPickingDate(false)}
          className="mt-2 w-full rounded-lg border border-haruto-sea/50 bg-transparent px-2 py-1 text-xs outline-none"
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
                minutesOf, allTasks, aiName, tags, subTags, sections, activePopupId, onRequestPopup, onClosePopup,
                onToggleDone, onToggleChecklist, onAddChecklistItem, onUpdateChecklistItem, onDeleteChecklistItem,
                onSetTaskReminder, onUpdateTaskDue, onAddSubtask, onUpdateTag, onUpdateTaskSection,
                onTogglePinned, onSetPriority, onSetMasterTask, onPomodoro, onDeleteTaskRecursive, onOpenSubTag,
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

