// 重要日页：左栏重要日（🎂生日/🎉节日/📌自定义）管理，右栏生理期迷你月历（记录 + 预测）
// 注意：经期预测只是日历推算，仅供参考，非医疗建议
import { useState } from 'react'
import type { ImportantDay, PeriodRecord } from '../types'

/* ---------- 日期工具（全部走本地时区，避免 toISOString 的 UTC 偏移问题） ---------- */

// 'YYYY-MM-DD' → 本地 Date
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Date → 'YYYY-MM-DD'
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 日期加 n 天（返回新对象）
function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

// a - b 的天数差
function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000)
}

/* ---------- 重要日常量 ---------- */

// 类型 → emoji（与表单选项一致）
const TYPE_EMOJI: Record<ImportantDay['type'], string> = {
  birthday: '🎂',
  festival: '🎉',
  custom: '📌',
}

// 表单里的类型选项
const TYPE_OPTIONS: { value: ImportantDay['type']; label: string }[] = [
  { value: 'birthday', label: '🎂 生日' },
  { value: 'festival', label: '🎉 节日' },
  { value: 'custom', label: '📌 自定义' },
]

// 从存储的 date（每年重复为 MM-DD，否则 YYYY-MM-DD，见 types.ts 约定）取 [月, 日]
function monthDayOf(date: string): [number, number] {
  const md = date.length === 5 ? date : date.slice(5)
  const [m, d] = md.split('-').map(Number)
  return [m, d]
}

// 计算重要日「下一次发生」的日期：每年重复取今年（已过则顺延到明年）的 MM-DD，否则原日期
// 用于「按日期临近排序」；平年的 2月29日 会被 Date 构造器自动顺延到 3月1日
function nextOccur(day: ImportantDay, todayStart: Date): Date {
  if (!day.repeatYearly) return parseDate(day.date)
  const [m, d] = monthDayOf(day.date)
  const thisYear = new Date(todayStart.getFullYear(), m - 1, d)
  return thisYear.getTime() < todayStart.getTime()
    ? new Date(todayStart.getFullYear() + 1, m - 1, d)
    : thisYear
}

export default function ImportantDays({ importantDays, periodRecords, onAddDay, onDeleteDay, onPeriodMark }: {
  importantDays: ImportantDay[]
  periodRecords: PeriodRecord[]
  onAddDay: (d: Omit<ImportantDay, 'id'>) => void
  onDeleteDay: (id: string) => void
  onPeriodMark: (date: string, kind: 'start' | 'end') => void // 标记经期开始/结束
}) {
  /* ---------- 左栏：添加表单状态 ---------- */
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ImportantDay['type']>('custom')
  const [date, setDate] = useState('')
  const [repeatYearly, setRepeatYearly] = useState(false)
  const [remindDays, setRemindDays] = useState(7) // 提前提醒天数，默认 7

  /* ---------- 右栏：月历视图状态 ---------- */
  const [view, setView] = useState(() => {
    const n = new Date()
    return { y: n.getFullYear(), m: n.getMonth() }
  })

  const now = new Date()
  const todayStr = fmtDate(now)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  /* ---------- 左栏：列表（按下一次发生的日期临近排序） ---------- */
  const sortedDays = [...importantDays].sort(
    (a, b) => nextOccur(a, todayStart).getTime() - nextOccur(b, todayStart).getTime()
  )

  const canSave = title.trim() !== '' && date !== ''
  const handleSave = () => {
    if (!canSave) return
    onAddDay({
      title: title.trim(),
      type,
      date: repeatYearly ? date.slice(5) : date, // 每年重复按约定只存 MM-DD
      repeatYearly,
      remindDaysBefore: remindDays,
      note: '',
    })
    // 保存后重置并收起表单
    setTitle('')
    setDate('')
    setType('custom')
    setRepeatYearly(false)
    setRemindDays(7)
    setAdding(false)
  }

  /* ---------- 右栏：经期记录与预测 ---------- */
  // 进行中的经期：endDate 为空且已开始（startDate <= 今天）
  const ongoing = periodRecords.find((r) => !r.endDate && r.startDate <= todayStr) ?? null

  // 某日期是否被已结束的记录覆盖
  const isRecorded = (s: string) =>
    periodRecords.some((r) => r.endDate && r.startDate <= s && s <= r.endDate)

  // —— 预测算法（纯日历推算，非医疗建议）——
  // 取最近最多 6 条记录：
  //   平均周期 = 相邻 startDate 差的均值（不足 2 条默认 28 天）
  //   平均经期长度 = (endDate - startDate + 1) 的均值（无完整记录默认 5 天）
  // 下次预测 = 最近一条 startDate + 平均周期，向后覆盖平均经期长度天
  const byStart = [...periodRecords].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const recent = byStart.slice(-6)
  const withEnd = recent.filter((r) => r.endDate)
  const avgCycle =
    recent.length >= 2
      ? Math.max(
          1,
          Math.round(
            recent.slice(1).reduce(
              (sum, r, i) => sum + diffDays(parseDate(r.startDate), parseDate(recent[i].startDate)),
              0
            ) / (recent.length - 1)
          )
        )
      : 28
  const avgLen = withEnd.length
    ? Math.max(
        1,
        Math.round(
          withEnd.reduce((sum, r) => sum + diffDays(parseDate(r.endDate!), parseDate(r.startDate)) + 1, 0) /
            withEnd.length
        )
      )
    : 5
  const predicted = new Set<string>()
  const latest = recent[recent.length - 1]
  if (latest) {
    const start = addDays(parseDate(latest.startDate), avgCycle)
    for (let i = 0; i < avgLen; i++) predicted.add(fmtDate(addDays(start, i)))
  }

  // 单元格状态：进行中（更红）> 已记录（浅红）> 预测（极浅红虚线）
  const statusOf = (s: string): 'ongoing' | 'recorded' | 'predicted' | 'none' => {
    if (ongoing && s >= ongoing.startDate && s <= todayStr) return 'ongoing'
    if (isRecorded(s)) return 'recorded'
    if (predicted.has(s)) return 'predicted'
    return 'none'
  }

  // 点击日期：有进行中的经期且点在其后 → 标记结束；否则未标记的日期 → 标记开始
  const handleCellClick = (s: string) => {
    if (ongoing && s > ongoing.startDate) {
      onPeriodMark(s, 'end')
      return
    }
    const marked = isRecorded(s) || (!!ongoing && s >= ongoing.startDate && s <= todayStr)
    if (!marked) onPeriodMark(s, 'start')
  }

  /* ---------- 月历几何 ---------- */
  const firstWeekday = new Date(view.y, view.m, 1).getDay() // 该月 1 号是周几（0 = 周日）
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  // 切月（自动处理跨年）
  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  // 「今天」回位到当前月份
  const goToday = () => {
    const n = new Date()
    setView({ y: n.getFullYear(), m: n.getMonth() })
  }

  return (
    <div className="p-6 flex gap-6">
      {/* ===== 左栏：重要日列表 ===== */}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold">重要日</h1>

        {/* 添加按钮 → 内联表单（标题 + 类型 + 日期 + 每年重复 + 提前提醒天数） */}
        {adding ? (
          <div
            className="task-item mt-4 rounded-xl border border-neutral-200 dark:border-neutral-700
              bg-white dark:bg-neutral-900 p-4"
          >
            <div className="flex gap-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') setAdding(false)
                }}
                placeholder="标题，如：妈妈生日"
                className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-700
                  bg-transparent px-3 py-2 text-sm outline-none focus:border-haruto-sea"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-neutral-200 dark:border-neutral-700
                  bg-transparent px-3 py-2 text-sm outline-none focus:border-haruto-sea"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* 类型选择 */}
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                    ${
                      type === t.value
                        ? 'border-haruto-sea bg-haruto-sea/10 text-haruto-sea font-medium'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400'
                    }`}
                >
                  {t.label}
                </button>
              ))}
              {/* 每年重复 */}
              <label className="flex items-center gap-1.5 text-xs text-neutral-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={repeatYearly}
                  onChange={(e) => setRepeatYearly(e.target.checked)}
                  className="accent-haruto-sea w-3.5 h-3.5"
                />
                每年重复
              </label>
              {/* 提前提醒天数（默认 7） */}
              <label className="flex items-center gap-1.5 text-xs text-neutral-500 select-none">
                提前
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={remindDays}
                  onChange={(e) => setRemindDays(Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
                  className="w-14 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent
                    px-2 py-1 text-xs text-center tabular-nums outline-none focus:border-haruto-sea"
                />
                天提醒
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setAdding(false)}
                className="text-xs px-3 py-1.5 rounded-lg text-neutral-400
                  hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-colors
                  ${
                    canSave
                      ? 'bg-haruto-sea text-white hover:opacity-90'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
                  }`}
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-4 w-full rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600
              py-2.5 text-sm text-neutral-400 hover:border-haruto-sea hover:text-haruto-sea transition-colors"
          >
            ＋ 添加重要日
          </button>
        )}

        {/* 重要日卡片列表：emoji + 标题 + 日期 + 每年重复标记 + 提醒说明 + hover 删除 */}
        <div className="mt-4 flex flex-col gap-2">
          {sortedDays.map((d) => {
            const [mo, dy] = monthDayOf(d.date)
            const daysLeft = diffDays(nextOccur(d, todayStart), todayStart)
            return (
              <div
                key={d.id}
                className="task-item group flex items-center gap-3 px-4 py-3 rounded-xl
                  border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900
                  hover:border-haruto-sea/60 hover:shadow-sm transition-all"
              >
                <span className="text-xl shrink-0">{TYPE_EMOJI[d.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{d.title}</span>
                    {d.repeatYearly && (
                      <span className="shrink-0 text-[10px] text-neutral-400">每年重复🔁</span>
                    )}
                  </div>
                  {/* Haruto 陪伴感文案 */}
                  <div className="mt-0.5 text-xs text-neutral-400 truncate">
                    提前 {d.remindDaysBefore} 天 Haruto 会和你聊起这件事
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                    {d.repeatYearly ? `每年 ${mo}月${dy}日` : d.date}
                  </div>
                  <div className="mt-0.5 text-[10px] text-neutral-400 tabular-nums">
                    {daysLeft === 0 ? '就是今天' : daysLeft > 0 ? `还有 ${daysLeft} 天` : `已过 ${-daysLeft} 天`}
                  </div>
                </div>
                {/* hover 显示删除 */}
                <button
                  onClick={() => onDeleteDay(d.id)}
                  title="删除"
                  className="shrink-0 text-xs text-neutral-400 opacity-0 group-hover:opacity-100
                    hover:text-red-500 transition-opacity"
                >
                  🗑
                </button>
              </div>
            )
          })}
          {!sortedDays.length && (
            <div className="py-8 text-center text-sm text-neutral-300 dark:text-neutral-600">
              还没有重要日，添加一个吧
            </div>
          )}
        </div>
      </div>

      {/* ===== 右栏：生理期迷你月历 ===== */}
      <aside
        className="w-[340px] shrink-0 rounded-xl border border-neutral-200 dark:border-neutral-700
          bg-white dark:bg-neutral-900 p-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">生理期</h2>
          {/* 「今天」回位 */}
          <button
            onClick={goToday}
            className="text-xs px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700
              text-neutral-500 hover:border-haruto-sea hover:text-haruto-sea transition-colors"
          >
            今天
          </button>
        </div>

        {/* 切月：« 2026年8月 » */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            onClick={() => shiftMonth(-1)}
            title="上个月"
            className="w-7 h-7 rounded-full text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10
              hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            «
          </button>
          <span className="min-w-[80px] text-center text-sm font-medium tabular-nums">
            {view.y}年{view.m + 1}月
          </span>
          <button
            onClick={() => shiftMonth(1)}
            title="下个月"
            className="w-7 h-7 rounded-full text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10
              hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            »
          </button>
        </div>

        {/* 星期表头（日~六） */}
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-400">
          {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
            <span key={w} className="py-1">
              {w}
            </span>
          ))}
        </div>

        {/* 日期格子：记录浅红 / 进行中更红 / 预测极浅红虚线 / 今天海蓝圆底白字 */}
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const s = fmtDate(new Date(view.y, view.m, day))
            const st = statusOf(s)
            const isToday = s === todayStr
            return (
              <button
                key={s}
                onClick={() => handleCellClick(s)}
                title={
                  st === 'ongoing' ? '经期进行中' : st === 'recorded' ? '已记录' : st === 'predicted' ? '预测' : '点击标记经期开始'
                }
                className={`h-9 rounded-lg flex items-center justify-center text-xs tabular-nums
                  transition-transform duration-200 hover:scale-105
                  ${
                    st === 'ongoing'
                      ? 'bg-[#ee8888] text-neutral-800'
                      : st === 'recorded'
                      ? 'bg-[#f4a6a6] text-neutral-800'
                      : st === 'predicted'
                      ? 'bg-[#fce8e8] border border-dashed border-red-200 text-neutral-600'
                      : 'text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
              >
                {/* 今天：海蓝圆底白字 */}
                <span
                  className={`flex items-center justify-center rounded-full ${
                    isToday ? 'w-6 h-6 bg-haruto-sea text-white' : ''
                  }`}
                >
                  {day}
                </span>
              </button>
            )
          })}
        </div>

        {/* 底部图例 */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-neutral-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[4px] bg-[#f4a6a6]" />
            记录中
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[4px] bg-[#ee8888]" />
            进行中
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[4px] bg-[#fce8e8] border border-dashed border-red-200" />
            预测
          </span>
          <span>点击标记开始/结束</span>
        </div>
        {/* 免责说明 */}
        <div className="mt-1.5 text-[10px] text-neutral-400">预测为日历推算，非医疗建议</div>
      </aside>
    </div>
  )
}
