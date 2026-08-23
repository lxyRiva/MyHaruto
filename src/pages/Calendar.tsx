// 月历页：7列×6行，任务色块+白字，今天海蓝高亮（SPEC F2，参考滴答清单月历）
import { useState } from 'react'
import type { Task, Tag } from '../types'

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

export default function Calendar({
  tasks, tags, onToggleTask,
}: {
  tasks: Task[]
  tags: Tag[]
  onToggleTask: (id: string, done: boolean) => void
}) {
  const now = new Date()
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() }) // m: 0-11
  const [selected, setSelected] = useState<string | null>(null)

  const tagMap = new Map(tags.map((t) => [t.id, t]))
  const mainTasks = tasks.filter((t) => !t.parentTaskId)

  // 生成 6×7=42 个格子（从当月第一天所在周的周日开始）
  const firstDay = new Date(view.y, view.m, 1)
  const gridStart = new Date(view.y, view.m, 1 - firstDay.getDay())
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => new Date(view.y, view.m, gridStart.getDate() + i))

  const today = fmtDate(now)
  const isCurrentMonth = (d: Date) => d.getFullYear() === view.y && d.getMonth() === view.m

  const tasksOn = (d: Date) => mainTasks.filter((t) => t.dueDate === fmtDate(d))

  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  return (
    <div className="p-6">
      {/* 工具栏：切月 + 今天 */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">{view.y}年{view.m + 1}月</h1>
        <button onClick={() => shiftMonth(-1)} className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm hover:border-haruto-sea">«</button>
        <button onClick={() => shiftMonth(1)} className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm hover:border-haruto-sea">»</button>
        <button
          onClick={() => { setView({ y: now.getFullYear(), m: now.getMonth() }); setSelected(null) }}
          className="px-3 py-1 rounded-lg text-sm bg-haruto-sea/10 text-haruto-sea"
        >
          今天
        </button>
      </div>

      {/* 星期表头 */}
      <div className="grid grid-cols-7 mt-4 text-center text-xs text-neutral-400">
        {WEEK.map((w) => <div key={w} className="py-1.5">{w}</div>)}
      </div>

      {/* 月历格子 */}
      <div className="grid grid-cols-7 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
        {cells.map((d, i) => {
          const ds = fmtDate(d)
          const inMonth = isCurrentMonth(d)
          const dayTasks = tasksOn(d)
          const isToday = ds === today
          return (
            <div
              key={i}
              onClick={() => setSelected(ds === selected ? null : ds)}
              className={`min-h-[96px] border-r border-b border-neutral-100 dark:border-neutral-800/60 last:border-r-0 p-1.5 cursor-pointer
                ${inMonth ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-900/40'}
                hover:bg-haruto-sea/5 transition-colors`}
            >
              <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs
                ${isToday ? 'bg-haruto-sea text-white font-bold' : inMonth ? 'text-neutral-600 dark:text-neutral-300' : 'text-neutral-300 dark:text-neutral-600'}`}
              >
                {d.getDate()}
              </div>
              <div className="mt-0.5">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="text-[11px] px-1.5 py-0.5 rounded mb-0.5 truncate text-white cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: t.tagId ? tagMap.get(t.tagId)?.color ?? '#6b7280' : '#6b7280', opacity: t.done ? 0.45 : 1 }}
                    title={t.title}
                  >
                    {t.done ? '' : ''}{t.title}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 点击日期：当日任务速览 */}
      {selected && (
        <div className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 animate-[fadeSlideIn_.2s_ease]">
          <div className="text-sm font-medium mb-2">{selected} 的任务</div>
          {tasksOn(new Date(selected + 'T00:00:00')).length === 0 ? (
            <div className="text-sm text-neutral-400">这天没有安排</div>
          ) : (
            tasksOn(new Date(selected + 'T00:00:00')).map((t) => (
              <label key={t.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => onToggleTask(t.id, e.target.checked)}
                  className="accent-haruto-sea w-4 h-4"
                />
                <span className={`text-sm ${t.done ? 'line-through text-neutral-400' : ''}`}>
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: t.tagId ? tagMap.get(t.tagId)?.color ?? '#6b7280' : '#6b7280' }} />
                  {t.title}
                </span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}
