// 习惯打卡页：周/月/年三视图（SPEC F3，参考滴答清单习惯模块 + 自定义月视图）
import { useState } from 'react'
import type { Habit, HabitRecord } from '../types'

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const EMOJIS = ['💧', '🏃', '📖', '🧘', '✍️', '🎯', '🥗', '😴']

export default function Habits({
  habits, habitRecords, onAddHabit, onToggleCheck, onSetMonthlyTarget,
}: {
  habits: Habit[]
  habitRecords: HabitRecord[]
  onAddHabit: (name: string, icon: string) => void
  onToggleCheck: (habitId: string, date: string) => void
  onSetMonthlyTarget: (habitId: string, n: number) => void
}) {
  const [view, setView] = useState<'week' | 'month' | 'year'>('week')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState(EMOJIS[0])

  const now = new Date()
  const checked = (habitId: string, date: string) =>
    habitRecords.some((r) => r.habitId === habitId && r.date === date)

  // 本周一~周日
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  // 连续打卡天数：从今天往回数（今天没打就从昨天起算）
  const streak = (habitId: string) => {
    let n = 0
    const d = new Date(now)
    if (!checked(habitId, fmtDate(d))) d.setDate(d.getDate() - 1)
    while (checked(habitId, fmtDate(d))) {
      n++
      d.setDate(d.getDate() - 1)
    }
    return n
  }

  const monthCount = (habitId: string) =>
    habitRecords.filter((r) => r.habitId === habitId && r.date.slice(0, 7) === fmtDate(now).slice(0, 7)).length

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const yearCount = (habitId: string) =>
    habitRecords.filter((r) => r.habitId === habitId && r.date.slice(0, 4) === String(now.getFullYear())).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">习惯打卡</h1>
        {/* 周/月/年 三段切换 */}
        <div className="flex rounded-lg bg-black/5 dark:bg-white/5 p-0.5 text-xs">
          {(['week', 'month', 'year'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md ${view === v ? 'bg-haruto-sea text-white' : 'text-neutral-500'}`}
            >
              {{ week: '周', month: '月', year: '年' }[v]}
            </button>
          ))}
        </div>
      </div>

      {/* 新习惯表单 */}
      <div className="mt-4">
        {adding ? (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setNewIcon(e)}
                  className={`w-8 h-8 rounded-lg text-lg ${newIcon === e ? 'bg-haruto-sea/15 ring-1 ring-haruto-sea' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                >{e}</button>
              ))}
            </div>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  onAddHabit(newName.trim(), newIcon)
                  setNewName(''); setAdding(false)
                }
                if (e.key === 'Escape') setAdding(false)
              }}
              placeholder="习惯名称，回车创建"
              className="flex-1 min-w-40 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700
                bg-white dark:bg-neutral-900 px-3 py-2 outline-none focus:border-haruto-sea"
            />
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="text-xs px-3 py-1.5 rounded-full border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-400 hover:border-haruto-sea hover:text-haruto-sea"
          >
            ＋ 新习惯
          </button>
        )}
      </div>

      {habits.length === 0 ? (
        <div className="py-20 text-center text-sm text-neutral-400">创建你的第一个习惯</div>
      ) : view === 'week' ? (
        /* ===== 周视图 ===== */
        <div className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-[160px_repeat(7,1fr)] bg-black/5 dark:bg-white/5 text-xs text-neutral-400 text-center">
            <div className="py-2" />
            {weekDays.map((d, i) => (
              <div key={i} className={`py-2 ${fmtDate(d) === fmtDate(now) ? 'text-haruto-sea font-bold' : ''}`}>
                {'一二三四五六日'[i]}<br />
                <span className="text-[10px] opacity-70">{d.getMonth() + 1}/{d.getDate()}</span>
              </div>
            ))}
          </div>
          {habits.map((h) => (
            <div key={h.id} className="grid grid-cols-[160px_repeat(7,1fr)] border-t border-neutral-100 dark:border-neutral-800/60 items-center">
              <div className="px-3 py-2.5 text-sm flex items-center gap-2">
                <span>{h.icon}</span>
                <span className="truncate">{h.name}</span>
                <span className="text-[10px] text-neutral-400 shrink-0">🔥{streak(h.id)}</span>
              </div>
              {weekDays.map((d, i) => {
                const ds = fmtDate(d)
                const on = checked(h.id, ds)
                return (
                  <button
                    key={i}
                    onClick={() => onToggleCheck(h.id, ds)}
                    className={`h-8 w-8 mx-auto rounded-full flex items-center justify-center text-xs transition-all
                      ${on ? 'bg-[#5b8c5a] text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-transparent'}
                      hover:scale-110 active:scale-95`}
                    title={ds}
                  >
                    ✓
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      ) : view === 'month' ? (
        /* ===== 月视图：竖排天数 × 竖排习惯名（SPEC 自定义设计） ===== */
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="grid grid-cols-[44px_repeat(habits.length,minmax(56px,1fr))] bg-black/5 dark:bg-white/5">
            <div className="py-2 text-[10px] text-neutral-400 text-center">日</div>
            {habits.map((h) => (
              <div key={h.id} className="py-2 flex flex-col items-center gap-0.5">
                <span className="text-sm">{h.icon}</span>
                <span className="[writing-mode:vertical-rl] text-[10px] text-neutral-500 max-h-14 overflow-hidden">{h.name}</span>
                <button
                  onClick={() => {
                    const n = Number(prompt(`「${h.name}」的月目标（当前 ${h.monthlyTarget}）`, String(h.monthlyTarget)))
                    if (n && n > 0) onSetMonthlyTarget(h.id, Math.floor(n))
                  }}
                  className="text-[10px] text-[#e07a5f] font-bold hover:underline"
                  title="点击修改月目标"
                >
                  {h.monthlyTarget}
                </button>
                <span className="text-[10px] text-[#6a994e] font-bold">{monthCount(h.id)}</span>
              </div>
            ))}
          </div>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            return (
              <div key={day} className="grid grid-cols-[44px_repeat(habits.length,minmax(56px,1fr))] border-t border-neutral-100 dark:border-neutral-800/60">
                <div className={`py-1.5 text-[10px] text-center ${ds === fmtDate(now) ? 'text-haruto-sea font-bold' : 'text-neutral-400'}`}>{day}</div>
                {habits.map((h) => {
                  const on = checked(h.id, ds)
                  return (
                    <button
                      key={h.id}
                      onClick={() => onToggleCheck(h.id, ds)}
                      className={`h-5 w-5 mx-auto my-1 rounded transition-all
                        ${on ? 'bg-[#5b8c5a]' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}
                      title={`${h.name} ${ds}`}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      ) : (
        /* ===== 年视图：极简透明边框表格 ===== */
        <div className="mt-4 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_100px] bg-black/5 dark:bg-white/5 text-xs text-neutral-400">
            <div className="px-3 py-2">习惯</div>
            <div className="py-2 text-center">已打卡</div>
            <div className="py-2 text-center">目标打卡</div>
          </div>
          {habits.map((h) => (
            <div key={h.id} className="grid grid-cols-[1fr_100px_100px] border-t border-neutral-100 dark:border-neutral-800/40 text-sm">
              <div className="px-3 py-2.5 flex items-center gap-2"><span>{h.icon}</span>{h.name}</div>
              <div className="py-2.5 text-center text-[#6a994e] font-bold">{yearCount(h.id)}</div>
              <div className="py-2.5 text-center text-[#e07a5f] font-bold">{h.monthlyTarget * 12}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
