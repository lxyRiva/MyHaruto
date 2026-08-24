// 番茄专注页（按参考图重写）：居中大圆环计时器 + 环上方任务胶囊 + 三按钮横排 + 右侧今日统计
// 计时显示用本地 useState + setInterval(250ms) 刷新，不依赖任何计时库；
// 进行中的会话状态由 App 通过 pomo(PomoDisplay) 下发，本页只负责展示与触发回调。
//
// 关键修正（问题4）：
// - 正计时 stopwatch = 无时间限制，无限往上走（分钟选择器在该模式下隐藏）；
// - 倒计时 countdown = 选分钟（15/25/45/60 预设 + 自定义 input）。
import { useEffect, useRef, useState } from 'react'
import type { Task, FocusSession } from '../types'

/** App 下发的「进行中专注会话」展示状态（与 App 侧共享的接口，字段必须完全一致） */
export interface PomoDisplay {
  taskId: string
  title: string
  mode: 'countdown' | 'stopwatch'
  startedAt: number // ms 时间戳
  totalMin: number // countdown 总分钟；stopwatch 无意义给 0
  endAt: number // countdown 结束时间戳；stopwatch 给 0
  remainingMs: number // 暂停时剩余；运行中忽略
  running: boolean
  swAccum: number // 正计时累计毫秒（暂停不清零；App 恢复时会把 startedAt 回拨该值）
}

/* ==================== 工具函数 ==================== */

/** 数字补零为两位字符串 */
const pad2 = (n: number): string => String(n).padStart(2, '0')

/** 毫秒 → 剩余时间 MM:SS（向上取整秒：开始瞬间显示满额，结束瞬间恰好归零） */
const fmtRemaining = (ms: number): string => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`
}

/** 毫秒 → 已进行 MM:SS（向下取整秒：从 00:00 起跳；正计时无上限，分钟数可无限进位） */
const fmtElapsed = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`
}

/** ISO 时间字符串 → 'HH:MM'（专注记录的开始时刻） */
const hhmm = (iso: string): string => iso.slice(11, 16)

/** 圆环几何参数：半径 120（viewBox 260），周长 = 2πr；环宽 7px（细环，参考图规格 6-8px） */
const RING_R = 120
const RING_C = 2 * Math.PI * RING_R

/** 时长预设（分钟）：仅倒计时模式可选 */
const PRESET_MINUTES = [15, 25, 45, 60]

/** 模式中文名 */
const MODE_LABEL: Record<'countdown' | 'stopwatch', string> = {
  countdown: '番茄计时',
  stopwatch: '正计时',
}

/* ==================== 页面组件 ==================== */
export default function PomodoroPage({
  tasks, selectedTaskId, onSelectTask, pomo, onStart, onToggle, onAbandon, onComplete, todaySessions, titleOf,
}: {
  tasks: Task[] // 可选任务池（今日 + 无日期未完成）
  selectedTaskId: string | null
  onSelectTask: (id: string) => void
  pomo: PomoDisplay | null
  onStart: (minutes: number, mode: 'countdown' | 'stopwatch') => void
  onToggle: () => void
  onAbandon: () => void
  onComplete: () => void
  todaySessions: FocusSession[]
  titleOf: (taskId: string) => string
}) {
  /** 顶部 tab 选中的模式（决定下一次开始的模式）；进行中时以 pomo.mode 为准 */
  const [tabMode, setTabMode] = useState<'countdown' | 'stopwatch'>('countdown')
  /** 当前选择的专注分钟数（预设或自定义，默认经典 25 分钟；仅倒计时使用） */
  const [minutes, setMinutes] = useState(25)
  /** 自定义分钟输入框的文本（独立于 minutes，保证输入流畅） */
  const [customText, setCustomText] = useState('')
  /** 本地时钟（250ms 跳动），用于刷新计时显示与到点检测 */
  const [nowTs, setNowTs] = useState(() => Date.now())
  /** 到点自动完成的一次性闸门（防止 interval 重复触发 onComplete） */
  const autoDoneRef = useRef(false)
  /**
   * 正计时暂停时的已进行时长缓存（250ms 精度）。
   * 说明：App 恢复正计时时会把 startedAt 回拨 swAccum，因此运行中 now-startedAt 恒等于
   * 累计总时长；但 App 在「多次暂停」时对 swAccum 的累加存在重复计数（页面层无法修复），
   * 故暂停态优先取本页在运行期持续刷新的缓存值，仅在页面挂载时才兜底读 swAccum。
   */
  const swElapsedCacheRef = useRef(0)
  /** 任务选择下拉菜单开关（点击环上方胶囊弹出） */
  const [taskMenuOpen, setTaskMenuOpen] = useState(false)

  /* ---------- 计时刷新：仅在存在进行中会话时开启 250ms 心跳 ---------- */
  useEffect(() => {
    if (!pomo) return
    const timer = setInterval(() => {
      const t = Date.now()
      // 运行中的正计时：缓存已进行时长，供暂停时兜底显示
      if (pomo.running && pomo.mode === 'stopwatch') {
        swElapsedCacheRef.current = Math.max(0, t - pomo.startedAt)
      }
      setNowTs(t)
    }, 250)
    return () => clearInterval(timer)
  }, [pomo])

  /* ---------- 换了一个新会话 → 重置到点闸门，并初始化正计时缓存 ---------- */
  useEffect(() => {
    autoDoneRef.current = false
    if (pomo && pomo.running && pomo.mode === 'stopwatch') {
      swElapsedCacheRef.current = Math.max(0, Date.now() - pomo.startedAt)
    }
  }, [pomo])

  /* ---------- countdown 到点自动完成（running 时才检查） ---------- */
  useEffect(() => {
    if (!pomo || pomo.mode !== 'countdown' || !pomo.running) return
    if (Date.now() >= pomo.endAt && !autoDoneRef.current) {
      autoDoneRef.current = true // 只触发一次，等 App 更新 pomo 状态
      onComplete()
    }
  }, [nowTs, pomo, onComplete])

  /** 展示中的模式：有会话用会话模式，否则用顶部 tab 选的模式 */
  const activeMode: 'countdown' | 'stopwatch' = pomo ? pomo.mode : tabMode
  /** 当前选中的任务对象（胶囊里显示它的标题） */
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null

  /* ---------- 计时数值计算 ---------- */
  /** 倒计时剩余毫秒：运行中按 endAt 推算，暂停时读 remainingMs */
  const remainingMs = pomo
    ? Math.max(0, pomo.running ? pomo.endAt - nowTs : pomo.remainingMs)
    : 0
  /**
   * 正计时已进行毫秒：
   * - 运行中：now - startedAt（App 恢复时已把 startedAt 回拨 swAccum，此差值即累计总时长，
   *   等价于「swAccum + 恢复后经过的时间」，且避免与 swAccum 相加造成重复累计）；
   * - 暂停中：优先读本页运行期缓存；页面挂载进暂停态（缓存为 0）时兜底读 swAccum。
   */
  const elapsedMs = pomo && pomo.mode === 'stopwatch'
    ? pomo.running
      ? Math.max(0, nowTs - pomo.startedAt)
      : swElapsedCacheRef.current > 0
        ? swElapsedCacheRef.current
        : pomo.swAccum
    : 0
  /** 中心大数字：countdown 显示剩余，stopwatch 显示已进行；空闲态显示预览值 */
  const display = !pomo
    ? tabMode === 'countdown'
      ? fmtRemaining(minutes * 60000) // 空闲预览所选时长，如 25:00
      : '00:00' // 正计时从零开始
    : pomo.mode === 'countdown'
      ? fmtRemaining(remainingMs)
      : fmtElapsed(elapsedMs)
  /**
   * 圆环进度：
   * - countdown：随时间流逝从 0 → 1 逐渐填满（剩余越少环越满）；
   * - stopwatch：无总时长概念，以「每小时一圈」循环填充（纯视觉动效，不影响计数值）；
   * - 空闲：countdown 预览满环（全部时间都在），stopwatch 空环。
   */
  const totalMs = (pomo?.totalMin ?? 0) * 60 * 1000
  const progress = !pomo
    ? tabMode === 'countdown' ? 1 : 0
    : pomo.mode === 'countdown'
      ? totalMs > 0
        ? 1 - Math.min(1, Math.max(0, remainingMs / totalMs))
        : 0
      : (elapsedMs % 3600000) / 3600000

  /** 重开：以相同参数重新 onStart（stopwatch 无分钟概念，传 0） */
  const handleRestart = () => {
    if (!pomo) return
    onStart(pomo.mode === 'countdown' ? pomo.totalMin : 0, pomo.mode)
  }

  /** 空闲态点击主按钮：开始新会话（正计时不受分钟数限制，传 0） */
  const handleStart = () => {
    if (pomo) { onToggle(); return }
    onStart(tabMode === 'countdown' ? minutes : 0, tabMode)
  }

  /** 今日概览统计 */
  const todayTotalMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0)

  return (
    <div className="p-6">
      {/* 顶部：标题 + 番茄计时/正计时小 tab（会话进行中锁定当前模式） */}
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">专注</h1>
        <div className="flex rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          {(['countdown', 'stopwatch'] as const).map((m) => (
            <button
              key={m}
              onClick={() => !pomo && setTabMode(m)}
              className={`rounded-md px-4 py-1 text-sm transition-colors ${
                activeMode === m
                  ? 'bg-haruto-sea text-white shadow-sm' // 海蓝选中
                  : pomo
                    ? 'cursor-not-allowed text-neutral-400 dark:text-neutral-600' // 进行中：锁定
                    : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </header>

      <div className="flex items-stretch gap-4">
        {/* ============ 左侧：主计时区（居中大圆环） ============ */}
        <main className="flex flex-1 flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          {/* ---- 圆环上方：任务名胶囊（白底海蓝描边，空闲时点击弹出任务选择列表） ---- */}
          {pomo ? (
            <div
              className="max-w-[300px] truncate rounded-full border border-haruto-sea bg-white px-5 py-1.5 text-sm text-haruto-sea dark:bg-neutral-900"
              title={pomo.title || titleOf(pomo.taskId)}
            >
              🍅 {pomo.title || titleOf(pomo.taskId)}
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setTaskMenuOpen((v) => !v)}
                className="flex max-w-[300px] items-center gap-1.5 rounded-full border border-haruto-sea/70 bg-white px-5 py-1.5 text-sm text-neutral-700 transition-all hover:border-haruto-sea hover:text-haruto-sea hover:shadow-sm dark:bg-neutral-900 dark:text-neutral-200"
              >
                <span className="truncate">
                  {selectedTask ? `🍅 ${selectedTask.title}` : '选择任务'}
                </span>
                <span className="text-[10px] opacity-60">▾</span>
              </button>

              {/* 点击胶囊弹出的任务选择列表（点空白处关闭） */}
              {taskMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTaskMenuOpen(false)} />
                  <div className="absolute left-1/2 top-full z-20 mt-2 max-h-64 w-72 -translate-x-1/2 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-lg animate-[fadeSlideIn_.15s_ease] dark:border-neutral-700 dark:bg-neutral-800">
                    {tasks.length === 0 ? (
                      <div className="py-6 text-center text-sm text-neutral-400">暂无可专注的任务</div>
                    ) : (
                      tasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => { onSelectTask(t.id); setTaskMenuOpen(false) }}
                          className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            selectedTaskId === t.id
                              ? 'bg-haruto-sea text-white' // 海蓝高亮选中
                              : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700/60'
                          }`}
                        >
                          <span className="truncate">{t.title}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ---- 居中大圆环计时器：细环（7px）+ 海蓝进度 + 中心巨大 MM:SS ---- */}
          <div className="relative mt-6" style={{ width: 260, height: 260 }}>
            <svg width={260} height={260} viewBox="0 0 260 260" className="-rotate-90">
              {/* 底环 */}
              <circle
                cx={130} cy={130} r={RING_R} fill="none" strokeWidth={7}
                className="stroke-neutral-200 dark:stroke-neutral-800"
              />
              {/* 进度环（海蓝） */}
              <circle
                cx={130} cy={130} r={RING_R} fill="none" strokeWidth={7} strokeLinecap="round"
                stroke="#3d7ea6"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - progress)}
                style={{ transition: 'stroke-dashoffset 0.3s linear' }}
              />
            </svg>
            {/* 中心：状态 + 巨大 MM:SS */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="mb-2 flex items-center text-xs text-neutral-400">
                {/* 运行状态小圆点：运行中海蓝呼吸，暂停灰色 */}
                <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                  pomo?.running ? 'animate-pulse bg-haruto-sea' : 'bg-neutral-300 dark:bg-neutral-600'
                }`} />
                {pomo ? (pomo.running ? '专注中' : '已暂停') : MODE_LABEL[tabMode]}
              </div>
              <div className="text-6xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">
                {display}
              </div>
              {pomo?.mode === 'countdown' && (
                <div className="mt-2 text-xs text-neutral-400">共 {pomo.totalMin} 分钟</div>
              )}
            </div>
          </div>

          {/* ---- 圆环下方按钮横排：放弃 | 开始/暂停（大且高亮）| 完成 | 重开 ----
               注：保留「完成」是因为正计时没有自然终点，必须给记录专注留出入口 */}
          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={onAbandon}
              disabled={!pomo}
              className="rounded-full px-5 py-2 text-sm text-neutral-400 transition-colors hover:text-red-500 disabled:pointer-events-none disabled:opacity-40 dark:text-neutral-500"
            >
              放弃
            </button>
            <button
              onClick={handleStart}
              disabled={!pomo && !selectedTaskId}
              className={`min-w-[120px] rounded-full px-8 py-3 text-base font-medium transition-all active:scale-95 ${
                !pomo && !selectedTaskId
                  ? 'cursor-not-allowed bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
                  : 'bg-haruto-sea text-white shadow-md hover:shadow-lg hover:opacity-90'
              }`}
            >
              {pomo ? (pomo.running ? '暂停' : '开始') : '开始专注'}
            </button>
            <button
              onClick={onComplete}
              disabled={!pomo}
              className="rounded-full border border-haruto-sea/70 px-5 py-2 text-sm text-haruto-sea transition-colors hover:bg-haruto-sea hover:text-white disabled:pointer-events-none disabled:opacity-40"
            >
              完成
            </button>
            <button
              onClick={handleRestart}
              disabled={!pomo}
              className="rounded-full border border-neutral-200 px-5 py-2 text-sm text-neutral-600 transition-colors hover:border-haruto-sea hover:text-haruto-sea disabled:pointer-events-none disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300"
            >
              重开
            </button>
          </div>

          {/* ---- 按钮下方：空闲态的时长选择（仅倒计时；正计时无限制，隐藏选择器） ---- */}
          {!pomo && tabMode === 'countdown' && (
            <div className="mt-8">
              <div className="text-center text-xs text-neutral-400">专注时长</div>
              <div className="mt-2 flex items-center justify-center gap-2">
                {PRESET_MINUTES.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setMinutes(p); setCustomText('') }}
                    className={`h-10 w-14 rounded-xl text-sm font-semibold transition-all ${
                      minutes === p && customText === ''
                        ? 'bg-haruto-sea text-white shadow-sm' // 海蓝选中
                        : 'border border-neutral-200 text-neutral-600 hover:border-haruto-sea hover:text-haruto-sea dark:border-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {p}
                    <span className="ml-0.5 text-[10px] font-normal">分</span>
                  </button>
                ))}
                {/* 自定义分钟 */}
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={customText}
                  onChange={(e) => {
                    setCustomText(e.target.value)
                    const n = Number(e.target.value)
                    if (Number.isFinite(n) && n >= 1) setMinutes(Math.floor(n)) // 非法输入不覆盖上次有效值
                  }}
                  placeholder="自定义"
                  className="h-10 w-24 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm tabular-nums
                    focus:border-haruto-sea focus:outline-none dark:border-neutral-700 transition-colors"
                />
                <span className="text-sm text-neutral-400">分钟</span>
              </div>
              {!selectedTaskId && (
                <p className="mt-3 text-center text-xs text-neutral-400">先点击上方胶囊选择任务，再开始专注</p>
              )}
            </div>
          )}
          {!pomo && tabMode === 'stopwatch' && (
            <p className="mt-8 text-xs text-neutral-400">
              正计时无时间限制，开始后自动从 00:00 往上累计{!selectedTaskId && '；先点击上方胶囊选择任务'}
            </p>
          )}
        </main>

        {/* ============ 右侧：今日统计面板 ============ */}
        <aside className="w-72 shrink-0 space-y-4">
          {/* 今日概览卡 */}
          <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">今日概览</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-neutral-50 p-3 text-center dark:bg-neutral-800/60">
                <div className="text-2xl">🍅</div>
                <div className="mt-1 text-xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {todaySessions.length}
                </div>
                <div className="text-xs text-neutral-400">今日番茄</div>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3 text-center dark:bg-neutral-800/60">
                <div className="text-2xl">⏱</div>
                <div className="mt-1 text-xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {todayTotalMinutes}
                </div>
                <div className="text-xs text-neutral-400">专注分钟</div>
              </div>
            </div>
          </section>

          {/* 今日专注记录列表：任务名 + N 分钟 + HH:MM */}
          <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">今日专注记录</h2>
            {todaySessions.length === 0 ? (
              <div className="py-6 text-center text-sm text-neutral-400">今天还没有专注记录</div>
            ) : (
              <div className="mt-2 max-h-[360px] space-y-1 overflow-y-auto pr-1">
                {todaySessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  >
                    {/* 海蓝小圆点 + 任务名（截断） */}
                    <span className="h-2 w-2 shrink-0 rounded-full bg-haruto-sea" />
                    <span className="min-w-0 flex-1 truncate text-sm text-neutral-700 dark:text-neutral-300" title={titleOf(s.taskId)}>
                      {titleOf(s.taskId)}
                    </span>
                    {/* 分钟数 */}
                    <span className="shrink-0 text-xs font-medium text-haruto-sea">{s.minutes} 分钟</span>
                    {/* 开始时刻 HH:MM */}
                    <span className="shrink-0 text-xs tabular-nums text-neutral-400">{hhmm(s.startedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
