// 月历页：7列×6行，任务色块+白字，今天海蓝高亮（SPEC F2，参考滴答清单月历）
// 速览区支持直接添加当天任务（回车保存）
//
// ===== 月历不显示任务的排查结论（问题5，已两次反馈）=====
// 逐行验证过数据流与格式，主链路无 bug：
// 1. 日期格式：任务页 date input 的 value 与 fmtDate 均为补零的 'YYYY-MM-DD'，
//    两者逐字符相等，字符串精确匹配不存在格式错位；
// 2. 格子生成：new Date(y, m, 1 - firstDay.getDay() + i) 由 Date 构造器自动跨月回退/前进，
//    跨月格子（上月末/下月初）携带各自正确的年月日，任务同样显示；
// 3. 切月：view.y/view.m 经 new Date(v.y, v.m+delta, 1) 滚动，1 月/12 月边界正常；
// 4. 真正「看不到」的两类原因（已针对性修复/提示）：
//    a) 任务没设日期（dueDate=null，新建时未选日期即为 null）—— 本就不该显示在月历，
//       现在底部加提示文案 + 顶栏加「无日期任务」计数，让用户知道原因；
//    b) 旧版 tasksOn 只过滤主任务（!t.parentTaskId），子任务即使有日期也被隐藏 ——
//       现改为显示全部任务，子任务条目前加「└ 」前缀。
import { useState } from 'react'
import type { Task, Tag } from '../types'

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

export default function Calendar({
  tasks, tags, onToggleTask, onAddTask,
}: {
  tasks: Task[] // App 传入 db.tasks 全量（含子任务），本页自行按日期匹配
  tags: Tag[]
  onToggleTask: (id: string, done: boolean) => void
  onAddTask: (title: string, date: string) => void
}) {
  const now = new Date()
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() }) // m: 0-11
  const [selected, setSelected] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('') // 速览区"添加当天任务"输入框内容
  const [mode, setMode] = useState<'month' | 'week'>('month') // 周/月视图切换
  const [weekOffset, setWeekOffset] = useState(0) // 周视图：相对本周的偏移

  // 周视图的 7 天（从本周/偏移周的周一开始）
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + weekOffset * 7)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
  const WEEK_MON = ['一', '二', '三', '四', '五', '六', '日']

  const tagMap = new Map(tags.map((t) => [t.id, t]))

  // 生成 6×7=42 个格子（从当月第一天所在周的周日开始）
  // 修复说明：直接用「1 - 首行偏移 + i」让 Date 构造器自行跨月，
  // 避免按 "当前月份 + 日期数字" 拼接导致跨月格子错位（历史 bug）。
  const firstDay = new Date(view.y, view.m, 1)
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => new Date(view.y, view.m, 1 - firstDay.getDay() + i))

  const today = fmtDate(now)
  const isCurrentMonth = (d: Date) => d.getFullYear() === view.y && d.getMonth() === view.m

  // 当日任务：显示全部任务（主任务 + 子任务），未完成的排在前面；
  // dueDate 为补零 'YYYY-MM-DD'，与 fmtDate(d) 一一对应（含跨月格子——它们携带自己的年月）
  const tasksOn = (ds: string) =>
    tasks.filter((t) => t.dueDate === ds).sort((a, b) => Number(a.done) - Number(b.done))

  // 无日期任务计数（未完成）：提示用户「月历上看不到它们」的原因
  const noDateCount = tasks.filter((t) => !t.dueDate && !t.done).length

  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  return (
    <div className="p-6">
      {/* 工具栏：标题 + 切换 + 今天 + 周/月视图切换 + 无日期任务计数提示 */}
      <div className="flex items-center gap-3">
        {mode === 'month' ? (
          <>
            <h1 className="text-xl font-bold">{view.y}年{view.m + 1}月</h1>
            <button onClick={() => shiftMonth(-1)} className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm hover:border-haruto-sea">«</button>
            <button onClick={() => shiftMonth(1)} className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm hover:border-haruto-sea">»</button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">
              {weekDays[0].getMonth() + 1}月{weekDays[0].getDate()}日 ~ {weekDays[6].getMonth() + 1}月{weekDays[6].getDate()}日
            </h1>
            <button onClick={() => setWeekOffset((w) => w - 1)} className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm hover:border-haruto-sea">«</button>
            <button onClick={() => setWeekOffset((w) => w + 1)} className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm hover:border-haruto-sea">»</button>
          </>
        )}
        <button
          onClick={() => {
            setView({ y: now.getFullYear(), m: now.getMonth() })
            setWeekOffset(0)
            setSelected(null)
          }}
          className="px-3 py-1 rounded-lg text-sm bg-haruto-sea/10 text-haruto-sea"
        >
          今天
        </button>
        {/* 周/月视图切换 */}
        <div className="flex rounded-lg bg-black/5 dark:bg-white/5 p-0.5 text-xs">
          {(['week', 'month'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setMode(v)}
              className={`px-3 py-1 rounded-md ${mode === v ? 'bg-haruto-sea text-white' : 'text-neutral-500'}`}
            >
              {v === 'week' ? '周' : '月'}
            </button>
          ))}
        </div>
        {/* 无日期任务计数：这些任务不会出现在月历 */}
        {noDateCount > 0 && (
          <span
            title="无日期的任务不会显示在月历，给任务设置日期即可"
            className="ml-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs text-neutral-400"
          >
            无日期任务 ×{noDateCount}
          </span>
        )}
      </div>

      {/* ===== 周视图：左侧时间刻度 + 7 列（周一~周日），总览用不可编辑 ===== */}
      {mode === 'week' && (
        <div className="mt-4 flex rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {/* 左侧时间刻度（纯视觉参考线，任务只有日期无时刻，条目置于列头下方） */}
          <div className="w-12 shrink-0 border-r border-neutral-100 dark:border-neutral-800/60 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="h-12 border-b border-neutral-100 dark:border-neutral-800/60" />
            {Array.from({ length: 17 }, (_, i) => i + 7).map((h) => (
              <div key={h} className="h-10 border-b border-dashed border-neutral-100 dark:border-neutral-800/40 text-[9px] text-neutral-400 pl-1.5 pt-0.5 tabular-nums">
                {h}:00
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7">
            {weekDays.map((d, i) => {
              const ds = fmtDate(d)
              const isToday = ds === today
              return (
                <div key={i} className={`border-r last:border-r-0 border-neutral-100 dark:border-neutral-800/60 min-h-[560px] ${isToday ? 'bg-haruto-sea/[0.04]' : ''}`}>
                  <div className={`h-12 flex flex-col items-center justify-center border-b border-neutral-100 dark:border-neutral-800/60 ${isToday ? 'text-haruto-sea font-bold' : 'text-neutral-500'}`}>
                    <span className="text-sm tabular-nums">{d.getDate()}</span>
                    <span className="text-[10px]">周{WEEK_MON[i]}</span>
                  </div>
                  <div className="p-1 space-y-1">
                    {tasksOn(ds).map((t) => (
                      <div
                        key={t.id}
                        title={(t.parentTaskId ? '└ ' : '') + t.title}
                        className={`text-[11px] px-1.5 py-1 rounded truncate text-white ${t.done ? 'line-through opacity-50' : ''}`}
                        style={{ backgroundColor: t.tagId ? tagMap.get(t.tagId)?.color ?? '#6b7280' : '#6b7280' }}
                      >
                        {t.parentTaskId ? '└ ' : ''}{t.title}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== 月视图 ===== */}
      {mode === 'month' && (<>
      {/* 星期表头 */}
      <div className="grid grid-cols-7 mt-4 text-center text-xs text-neutral-400">
        {WEEK.map((w) => <div key={w} className="py-1.5">{w}</div>)}
      </div>

      {/* 月历格子 */}
      <div className="grid grid-cols-7 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
        {cells.map((d, i) => {
          const ds = fmtDate(d)
          const inMonth = isCurrentMonth(d)
          const dayTasks = tasksOn(ds) // 用格子自己的日期字符串匹配（跨月格子同样生效）
          const isToday = ds === today
          return (
            <div
              key={i}
              onClick={() => { const next = ds === selected ? null : ds; setSelected(next); setNewTitle('') }}
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
                    title={(t.parentTaskId ? '└ ' : '') + t.title}
                  >
                    {/* 子任务条目前加「└ 」前缀，与任务列表页的层级视觉一致 */}
                    {t.parentTaskId ? '└ ' : ''}{t.title}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 底部小字：解释「无日期任务为何不显示」 */}
      <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
        无日期的任务不会显示在月历，给任务设置日期即可
      </p>

      {/* 点击日期：当日任务速览（含子任务） */}
      {selected && (
        <div className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 animate-[fadeSlideIn_.2s_ease]">
          <div className="text-sm font-medium mb-2">{selected} 的任务</div>
          {tasksOn(selected).length === 0 ? (
            <div className="text-sm text-neutral-400">这天没有安排</div>
          ) : (
            tasksOn(selected).map((t) => (
              <label key={t.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => onToggleTask(t.id, e.target.checked)}
                  className="accent-haruto-sea w-4 h-4"
                />
                <span className={`text-sm ${t.done ? 'line-through text-neutral-400' : ''}`}>
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: t.tagId ? tagMap.get(t.tagId)?.color ?? '#6b7280' : '#6b7280' }} />
                  {/* 子任务在速览里同样带「└ 」前缀 */}
                  {t.parentTaskId ? '└ ' : ''}{t.title}
                </span>
              </label>
            ))
          )}

          {/* 速览区底部：快速添加当天任务（回车保存） */}
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const title = newTitle.trim()
              if (!title) return
              onAddTask(title, selected) // selected 即 'YYYY-MM-DD'，与 date input 格式一致
              setNewTitle('')
            }}
            placeholder="+ 添加当天任务，回车保存"
            className="mt-2 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-1.5 text-sm
              placeholder:text-neutral-400 focus:border-haruto-sea focus:outline-none
              dark:border-neutral-700 dark:placeholder:text-neutral-500 transition-colors"
          />
        </div>
      )}
      </>)}
    </div>
  )
}
