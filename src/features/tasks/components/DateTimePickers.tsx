// 日期/时间选择组件集（RF-P2a 自 BoardView.tsx 原样迁入）
// RF-Fix3c v1.16：DatePickerModal 补容器级 Escape（原零 Escape；对齐 FloatingMenu 写法）
// RF-P3c：localToday/pad2 收口 shared/utils/date（原导出删除，消费方直连 date.ts）
import { useEffect, useState } from 'react'
import { todayStr, pad2 } from '../../../shared/utils/date'

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
  const [customDate, setCustomDate] = useState(todayStr()) // 修正3：自定义可选日期
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
    return todayStr()
  })
  const diffDays = (a: string, b: string) => Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000)

  // v1.16：容器级 Escape 关闭（不依赖焦点在哪个元素）
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onCancel])

  const first = new Date(view.y, view.m, 1)
  const cells = Array.from({ length: 42 }, (_, i) => new Date(view.y, view.m, 1 - first.getDay() + i))
  const today = todayStr()
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

