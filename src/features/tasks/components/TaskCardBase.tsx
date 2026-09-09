// 任务卡基元（RF-Fix3c 第6项，§10 视图一致性）：纯展示零业务，≤300 行 / props ≤12
// 渲染：勾选框 + 优先级点 + 标题 + meta 行（吃 taskMeta.buildTaskMeta 唯一组装）+ 子任务折叠递归
// 视图差异禁止入内：点击行为（右栏选中 vs 悬空弹窗）、选中态样式、右键菜单/日期/子任务输入等
// 接线全部留在消费层（ListTaskCard / TaskCard 以薄壳包裹本基元，子卡经 renderChild 回调递归）
import { useState, type ReactNode } from 'react'
import type { Section, SubTag, Tag, Task } from '../../../shared/types'
import { IconChat, IconChevron, IconClock } from '../../../shared/components/icons'
import { buildTaskMeta } from '../utils/taskMeta'

export interface TaskCardBaseMetaDeps {
  minutesOf: (id: string) => number
  tagMap: Map<string, Tag>
  sections?: Section[]
  subTags?: SubTag[]
}

export default function TaskCardBase({
  task,
  metaDeps,
  childrenTasks,
  onToggleDone,
  onOpenSubTag,
  onEditDate,
  renderChild,
  variant = 'list',
  showFirstLine = false,
}: {
  task: Task
  /** buildTaskMeta 入参包（基元零业务：只消费组装结果，不持状态不写数据） */
  metaDeps: TaskCardBaseMetaDeps
  /** 直接子任务（消费层按视图语义过滤：防环/折叠散件排除等） */
  childrenTasks: Task[]
  onToggleDone: (id: string) => void
  /** H2 徽章点击跳看板（看板链可不传 = 纯展示徽章） */
  onOpenSubTag?: (subTagId: string) => void
  /** 日期点击编辑（消费层开 DatePickerModal；不传 = 纯展示日期，收尾段回归修复） */
  onEditDate?: () => void
  /** 子卡渲染回调：消费层返回自己的薄壳卡（点击行为/菜单接线随消费层；防环 seen 由消费层闭包累积） */
  renderChild: (child: Task) => ReactNode
  /** 布局变体：list=横板（sm 字号/日期在标题右侧） board=看板（13px/日期铃铛在 meta 行） */
  variant?: 'list' | 'board'
  /** 横板特有：标题下第一行（描述或检查事项首项） */
  showFirstLine?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  // meta 行唯一组装点（taskMeta.buildTaskMeta，单点化）
  const meta = buildTaskMeta(task, metaDeps)
  const firstLine = showFirstLine
    ? task.description
      ? task.description.split('\n')[0]
      : task.checklistItems[0]?.text
    : undefined
  const hasChildren = childrenTasks.length > 0
  const visibleChildren = expanded ? childrenTasks : childrenTasks.slice(0, 1)
  const titleTone = task.done ? 'text-neutral-400 line-through' : 'text-neutral-700 dark:text-neutral-200'
  // RF-P2 勾选框按优先级变色（色板同 taskMeta PRIO_COLOR：高=红/中=橙/低=蓝；none 回落中性灰）；done 绿保持完成语义
  const prioColor = task.done ? undefined : meta.priorityFlag

  const checkbox = (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggleDone(task.id)
      }}
      title={task.done ? '标记为未完成' : '标记为完成'}
      style={prioColor ? { borderColor: prioColor } : undefined}
      className={`grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border transition-colors ${
        task.done
          ? 'border-[#5b8c5a] bg-[#5b8c5a] text-white'
          : prioColor
            ? 'text-transparent'
            : 'border-neutral-300 text-transparent hover:border-haruto-sea dark:border-neutral-600'
      } ${variant === 'board' ? 'mt-0.5' : 'mt-0.5'}`}
    >
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2.5 6 5 8.5 9.5 3.5" />
      </svg>
    </button>
  )

  const titleRow = (
    <div className="flex items-start gap-1.5">
      {meta.priorityFlag && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: meta.priorityFlag }} title={`优先级：${(task.priority ?? 'none') as 'high' | 'mid' | 'low' | 'none'}`} />
      )}
      <div className={`min-w-0 flex-1 leading-snug break-all ${variant === 'list' ? 'text-sm' : 'text-[13px]'} ${titleTone}`}>
        {task.title}
      </div>
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
          title={expanded ? '收起子任务' : '展开子任务'}
          className="shrink-0 text-neutral-400 hover:text-haruto-sea"
        >
          <IconChevron open={expanded} />
        </button>
      )}
    </div>
  )

  // RF-P4 日期色：过期未完成红显（判定唯一来源 taskMeta.dateOverdue）；今天紫（既定）；其余中性
  const dateTone = meta.dateOverdue
    ? 'font-medium text-red-500'
    : meta.dateText === '今天'
      ? 'font-medium text-purple-500'
      : 'text-neutral-600 dark:text-neutral-300'
  // RF-P5 meta 行重排（两变体统一）：最左=H2 标签色点 → 中间=置顶/提醒/统计 → 最右=日期（点击编辑由消费层注入）
  const dateEl = meta.dateText ? (
    onEditDate ? (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onEditDate()
        }}
        title="点击修改日期与提醒"
        className={`shrink-0 tabular-nums hover:text-haruto-sea hover:underline ${dateTone}`}
      >
        {meta.dateText}
      </button>
    ) : (
      <span className={`shrink-0 tabular-nums ${dateTone}`}>{meta.dateText}</span>
    )
  ) : null

  const metaRow = (
    <div className={`flex items-center text-[11px] ${variant === 'list' ? 'mt-1 gap-2' : 'mt-1 gap-2.5'}`}>
      {/* 最左：归属徽章（H2 色点/H1 清单名） */}
      {meta.tagBadge && (
        <span className="flex min-w-0 items-center gap-1" title={meta.tagBadge.name}>
          {meta.tagBadge.emoji ? (
            <span className="shrink-0 text-[10px]">{meta.tagBadge.emoji}</span>
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: meta.tagBadge.color }} />
          )}
          {meta.tagBadge.kind === 'h2' && onOpenSubTag ? (
            <span
              onClick={(e) => {
                e.stopPropagation()
                onOpenSubTag(meta.tagBadge!.id)
              }}
              className="cursor-pointer truncate hover:text-haruto-sea hover:underline"
              title="查看该标签看板"
            >
              {meta.tagBadge.name}
            </span>
          ) : (
            <span className="truncate" style={{ color: meta.tagBadge.color }}>{meta.tagBadge.name}</span>
          )}
        </span>
      )}
      {/* 中间：置顶/提醒/统计 */}
      {task.isPinnedToday && <span className="text-[10px] text-haruto-sea">置顶</span>}
      {variant === 'board' && meta.alarmIcon && (
        <span className="flex items-center text-haruto-sea" title="已设提醒">
          <span className="[&>svg]:h-3 [&>svg]:w-3">
            <IconClock />
          </span>
        </span>
      )}
      {meta.minutes > 0 && (
        <span className="flex shrink-0 items-center gap-0.5 text-neutral-400 tabular-nums" title={`已专注 ${meta.minutes} 分钟`}>
          <span className="[&>svg]:h-3 [&>svg]:w-3">
            <IconClock />
          </span>
          {meta.minutes}分
        </span>
      )}
      {meta.checklistProgress && variant === 'board' && (
        <span className="shrink-0 text-neutral-400 tabular-nums" title="检查事项进度">
          ✓{meta.checklistProgress.done}/{meta.checklistProgress.total}
        </span>
      )}
      <span
        className={`flex items-center gap-0.5 ${
          task.taskComments.length > 0 ? 'text-[#6a994e]' : 'text-neutral-300 dark:text-neutral-600'
        }`}
        title={task.taskComments.length > 0 ? `${task.taskComments.length} 条留言` : '暂无留言'}
      >
        <span className="[&>svg]:h-3 [&>svg]:w-3">
          <IconChat />
        </span>
        {task.taskComments.length > 0 && <span className="tabular-nums">{task.taskComments.length}</span>}
      </span>
      {/* 最右：日期 */}
      {dateEl && <span className="ml-auto min-w-0 text-right">{dateEl}</span>}
    </div>
  )

  return (
    <>
      <div className={`flex items-start ${variant === 'list' ? 'gap-2.5' : 'gap-2'}`}>
        {checkbox}
        <div className="min-w-0 flex-1">
          {titleRow}
          {firstLine && <div className="mt-0.5 truncate text-[11px] text-neutral-400">{firstLine}</div>}
          {metaRow}
        </div>
      </div>

      {/* 子任务折叠递归：默认显示第一个 + 「还有 N 项」；子卡由消费层 renderChild 提供 */}
      {hasChildren && (
        <div className={`mt-2 space-y-2 border-l-2 border-neutral-100 dark:border-neutral-800 ${variant === 'list' ? 'pl-2.5' : 'pl-2'}`}>
          {visibleChildren.map((c) => renderChild(c))}
          {!expanded && childrenTasks.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(true)
              }}
              className="pl-1 text-[10px] text-neutral-400 transition-colors hover:text-haruto-sea"
            >
              还有 {childrenTasks.length - 1} 项
            </button>
          )}
        </div>
      )}
    </>
  )
}
