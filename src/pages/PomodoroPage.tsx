// 番茄专注页（参考滴答清单专注页：左侧主计时区 + 右侧今日概览，飞书极简风 + 暗色适配）
// 计时显示用本地 useState + setInterval(250ms) 刷新，不依赖任何计时库；
// 进行中的会话状态由 App 通过 pomo(PomoDisplay) 下发，本页只负责展示与触发回调。
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
}

/* ==================== 工具函数 ==================== */

/** 数字补零为两位字符串 */
const pad2 = (n: number): string => String(n).padStart(2, '0')

/** 毫秒 → 剩余时间 MM:SS（向上取整秒：开始瞬间显示满额，结束瞬间恰好归零） */
const fmtRemaining = (ms: number): string => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`
}

/** 毫秒 → 已进行 MM:SS（向下取整秒：从 00:00 起跳，超过 1 小时进位到分钟数） */
const fmtElapsed = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`
}

/** ISO 时间字符串 → 'HH:MM'（专注记录的开始时刻） */
const hhmm = (iso: string): string => iso.slice(11, 16)

/** 圆环几何参数：半径 96（viewBox 240），周长 = 2πr */
const RING_R = 96
const RING_C = 2 * Math.PI * RING_R

/** 时长预设（分钟） */
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
  /** 当前选择的专注分钟数（预设或自定义，默认经典 25 分钟） */
  const [minutes, setMinutes] = useState(25)
  /** 自定义分钟输入框的文本（独立于 minutes，保证输入流畅） */
  const [customText, setCustomText] = useState('')
  /** 本地时钟（250ms 跳动），用于刷新计时显示与到点检测 */
  const [nowTs, setNowTs] = useState(() => Date.now())
  /** 到点自动完成的一次性闸门（防止 interval 重复触发 onComplete） */
  const autoDoneRef = useRef(false)
  /**
   * 正计时暂停时的已进行时长缓存（250ms 精度）。
   * 防御性兜底：若 App 在暂停时未把累计时长写进 remainingMs（其内部用 swAccum 另存），
   * 用最近一次运行中的计算值兜底，避免暂停瞬间跳回 00:00。
   */
  const swElapsedCacheRef = useRef(0)

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

  /* ---------- 计时数值计算 ---------- */
  /** 倒计时剩余毫秒：运行中按 endAt 推算，暂停时读 remainingMs */
  const remainingMs = pomo
    ? Math.max(0, pomo.running ? pomo.endAt - nowTs : pomo.remainingMs)
    : 0
  /**
   * 正计时已进行毫秒：运行中从 startedAt 累计；暂停时优先读 remainingMs
   * （App 把暂停时的累计写进该字段），为 0 则用运行期缓存值兜底。
   */
  const elapsedMs = pomo
    ? pomo.running
      ? Math.max(0, nowTs - pomo.startedAt)
      : pomo.remainingMs > 0
        ? pomo.remainingMs
        : swElapsedCacheRef.current
    : 0
  /** 中心大数字：countdown 显示剩余，stopwatch 显示已进行 */
  const display = pomo
    ? pomo.mode === 'countdown'
      ? fmtRemaining(remainingMs)
      : fmtElapsed(elapsedMs)
    : ''
  /** 圆环进度：countdown = 剩余/总；stopwatch 无进度概念，满环呼吸 */
  const totalMs = (pomo?.totalMin ?? 0) * 60 * 1000
  const progress = !pomo
    ? 0
    : pomo.mode === 'stopwatch'
      ? 1
      : totalMs > 0
        ? Math.min(1, Math.max(0, remainingMs / totalMs))
        : 0

  /** 重开：以相同参数重新 onStart（stopwatch 的 totalMin 无意义，回退用当前所选分钟数） */
  const handleRestart = () => {
    if (!pomo) return
    const m = pomo.mode === 'countdown' ? pomo.totalMin : minutes
    onStart(m, pomo.mode)
  }

  /** 今日概览统计 */
  const todayTotalMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0)

  return (
    <div className="p-6">
      {/* 顶部小标题栏：标题 + 番茄计时/正计时切换 */}
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">专注</h1>
        <div className="flex rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          {(['countdown', 'stopwatch'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setTabMode(m)}
              className={`rounded-md px-4 py-1 text-sm transition-colors ${
                activeMode === m
                  ? 'bg-haruto-sea text-white shadow-sm' // 海蓝选中
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </header>

      <div className="flex items-stretch gap-4">
        {/* ============ 左侧：主计时区 ============ */}
        <main className="flex-1 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          {!pomo ? (
            /* ---------- 空闲态：时长选择 + 任务池 ---------- */
            <div className="mx-auto max-w-md">
              {/* 时长选择（当前模式为顶部 tab 所选） */}
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                时长选择
                <span className="ml-2 text-xs font-normal text-neutral-400">{MODE_LABEL[tabMode]}</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {PRESET_MINUTES.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setMinutes(p); setCustomText('') }}
                    className={`h-16 rounded-xl text-lg font-semibold transition-all ${
                      minutes === p && customText === ''
                        ? 'bg-haruto-sea text-white shadow-sm' // 海蓝选中
                        : 'border border-neutral-200 text-neutral-600 hover:border-haruto-sea hover:text-haruto-sea dark:border-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {p}
                    <span className="ml-0.5 text-xs font-normal">分钟</span>
                  </button>
                ))}
              </div>
              {/* 自定义分钟 */}
              <div className="mt-3 flex items-center gap-2">
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
                  className="w-28 rounded-lg border border-neutral-200 bg-transparent px-3 py-1.5 text-sm
                    focus:border-haruto-sea focus:outline-none dark:border-neutral-700 transition-colors"
                />
                <span className="text-sm text-neutral-400">分钟</span>
              </div>

              {/* 提示：先从任务池点选任务 */}
              <div className="mt-5 text-sm font-medium text-neutral-900 dark:text-neutral-100">任务池</div>
              <p className="mt-1 text-xs text-neutral-400">先从下方点选一个任务，再开始专注</p>
              <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="py-6 text-center text-sm text-neutral-400">暂无可专注的任务</div>
                ) : (
                  tasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onSelectTask(t.id)}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedTaskId === t.id
                          ? 'bg-haruto-sea text-white' // 海蓝高亮选中
                          : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span className="truncate">{t.title}</span>
                    </button>
                  ))
                )}
              </div>

              {/* 开始专注：未选任务时禁用 */}
              <button
                disabled={!selectedTaskId}
                onClick={() => onStart(minutes, tabMode)}
                className={`mt-5 w-full rounded-xl py-2.5 text-sm font-medium transition-all ${
                  selectedTaskId
                    ? 'bg-haruto-sea text-white shadow-sm hover:opacity-90'
                    : 'cursor-not-allowed bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
                }`}
              >
                开始专注{selectedTaskId ? ` · ${minutes} 分钟` : ''}
              </button>
            </div>
          ) : (
            /* ---------- 进行中：大圆环 + 任务名 + 操作按钮 ---------- */
            <div className="flex flex-col items-center">
              <div className="relative" style={{ width: 240, height: 240 }}>
                {/* SVG 进度环：countdown 按剩余/总收缩；stopwatch 满环呼吸 */}
                <svg width={240} height={240} viewBox="0 0 240 240" className="-rotate-90">
                  <circle
                    cx={120} cy={120} r={RING_R} fill="none" strokeWidth={12}
                    className="stroke-neutral-200 dark:stroke-neutral-800"
                  />
                  <circle
                    cx={120} cy={120} r={RING_R} fill="none" strokeWidth={12} strokeLinecap="round"
                    stroke="#3d7ea6"
                    strokeDasharray={RING_C}
                    strokeDashoffset={RING_C * (1 - progress)}
                    className={pomo.mode === 'stopwatch' ? 'animate-pulse' : ''}
                    style={{ transition: 'stroke-dashoffset 0.25s linear' }}
                  />
                </svg>
                {/* 中心：状态 + 大数字 MM:SS */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="mb-1 text-xs text-neutral-400">
                    {pomo.running ? '专注中' : '已暂停'} · {MODE_LABEL[pomo.mode]}
                  </div>
                  <div className="text-5xl font-bold tabular-nums tracking-wider text-neutral-900 dark:text-neutral-100">
                    {display}
                  </div>
                  {pomo.mode === 'countdown' && (
                    <div className="mt-1 text-xs text-neutral-400">共 {pomo.totalMin} 分钟</div>
                  )}
                </div>
              </div>

              {/* 圆环下任务名 */}
              <div className="mt-4 max-w-full truncate text-sm text-neutral-500 dark:text-neutral-400" title={pomo.title}>
                {pomo.title || titleOf(pomo.taskId)}
              </div>

              {/* 操作按钮组：开始/暂停、重开、放弃、完成 */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={onToggle}
                  className="min-w-[96px] rounded-xl bg-haruto-sea px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90"
                >
                  {pomo.running ? '暂停' : '开始'}
                </button>
                <button
                  onClick={handleRestart}
                  className="rounded-xl border border-neutral-200 px-5 py-2 text-sm text-neutral-600 transition-colors
                    hover:border-haruto-sea hover:text-haruto-sea dark:border-neutral-700 dark:text-neutral-300"
                >
                  重开
                </button>
                <button
                  onClick={onComplete}
                  className="rounded-xl border border-haruto-sea px-5 py-2 text-sm text-haruto-sea transition-colors hover:bg-haruto-sea hover:text-white"
                >
                  完成
                </button>
                <button
                  onClick={onAbandon}
                  className="rounded-xl border border-transparent px-5 py-2 text-sm text-neutral-400 transition-colors
                    hover:border-red-300 hover:text-red-500 dark:hover:border-red-500/50"
                >
                  放弃
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ============ 右侧：今日概览区 ============ */}
        <aside className="w-[300px] shrink-0 space-y-4">
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

          {/* 今日专注记录列表 */}
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
