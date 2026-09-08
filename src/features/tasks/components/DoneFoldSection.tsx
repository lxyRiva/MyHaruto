// 横板视图「已完成」折叠区（RF-Fix2 修复A）：默认折叠，标题「已完成 N」，垫底显示
// 成员 = 调用方给定的根任务数组（视图筛选 ∩ 折叠判定），子孙经 ListTaskCard 嵌套跟随
import { useState } from 'react'
import type { Task } from '../../../shared/types'
import { IconChevron } from '../../../shared/components/icons'
import ListTaskCard from './ListTaskCard'
import type { ListCardCallbacks } from './ListTaskCard'

export function DoneFoldSection({
  roots,
  tasks,
  selectedId,
  onSelect,
  minutesOf,
  callbacks,
}: {
  roots: Task[]
  tasks: Task[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  minutesOf: (id: string) => number
  callbacks: ListCardCallbacks
}) {
  const [open, setOpen] = useState(false)
  if (roots.length === 0) return null // 空区不渲染（与看板折叠区行为一致）
  return (
    <div className="mt-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded px-1 py-0.5 text-xs text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
      >
        <IconChevron open={open} />
        已完成 {roots.length}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {roots.map((t) => (
            <ListTaskCard
              key={t.id}
              task={t}
              allTasks={tasks}
              depth={0}
              seen={new Set([t.id])}
              selected={selectedId === t.id}
              onSelect={() => onSelect(selectedId === t.id ? null : t.id)}
              minutesOf={minutesOf}
              {...callbacks}
            />
          ))}
        </div>
      )}
    </div>
  )
}
