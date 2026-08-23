// 番茄钟底部浮动条：选时长 → 倒计时/正计时 → 结束自动计入专注记录（SPEC F1）
import { useEffect, useState } from 'react'
import type { Task } from '../types'

export interface PomodoroState {
  taskId: string
  title: string
  mode: 'countdown' | 'stopwatch'
  startedAt: number
  totalMin: number
  endAt: number // stopwatch 为 0
  remainingMs: number
  running: boolean
  swAccum: number // 正计时累计毫秒
}

export default function PomodoroBar({
  task, state, onStart, onToggle, onAbandon, onComplete,
}: {
  task: Task | null
  state: PomodoroState | null
  onStart: (minutes: number, mode: 'countdown' | 'stopwatch') => void
  onToggle: () => void
  onAbandon: () => void
  onComplete: () => void
}) {
  const [minutes, setMinutes] = useState(25)
  const [mode, setMode] = useState<'countdown' | 'stopwatch'>('countdown')
  const [, forceTick] = useState(0)

  // 每秒刷新；倒计时到点自动完成
  useEffect(() => {
    const t = setInterval(() => {
      forceTick((n) => n + 1)
      if (state?.running && state.mode === 'countdown' && Date.now() >= state.endAt) onComplete()
    }, 1000)
    return () => clearInterval(t)
  }, [state, onComplete])

  // 选时长面板
  if (!state) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-2xl shadow-lg
        bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3">
        <span className="text-sm font-medium max-w-36 truncate">{task ? `🍅 ${task.title}` : '🍅 番茄钟'}</span>
        <div className="flex rounded-lg bg-black/5 dark:bg-white/5 p-0.5 text-[11px]">
          <button onClick={() => setMode('countdown')} className={`px-2 py-1 rounded-md ${mode === 'countdown' ? 'bg-haruto-sea text-white' : 'text-neutral-500'}`}>倒计时</button>
          <button onClick={() => setMode('stopwatch')} className={`px-2 py-1 rounded-md ${mode === 'stopwatch' ? 'bg-haruto-sea text-white' : 'text-neutral-500'}`}>正计时</button>
        </div>
        <select
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          disabled={mode === 'stopwatch'}
          className="text-sm rounded-lg border border-neutral-200 dark:border-neutral-600
            bg-neutral-50 dark:bg-neutral-900 px-2 py-1 outline-none disabled:opacity-40"
        >
          {[15, 25, 45, 60].map((m) => (
            <option key={m} value={m}>{m} 分钟</option>
          ))}
        </select>
        <button
          disabled={!task}
          onClick={() => task && onStart(minutes, mode)}
          className="text-sm px-3 py-1 rounded-lg bg-haruto-sea text-white disabled:opacity-40"
        >
          开始专注
        </button>
      </div>
    )
  }

  // 计时中：倒计时显示剩余；正计时显示累计（运行中实时，暂停时停在累计值）
  const msLeft = state.mode === 'countdown'
    ? (state.running ? Math.max(0, state.endAt - Date.now()) : state.remainingMs)
    : (state.running ? state.swAccum + (Date.now() - state.startedAt) : state.swAccum)
  const mm = String(Math.floor(msLeft / 60000)).padStart(2, '0')
  const ss = String(Math.floor((msLeft % 60000) / 1000)).padStart(2, '0')

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-2xl shadow-lg
      bg-white dark:bg-neutral-800 border border-haruto-sea/40 px-5 py-3 animate-[fadeSlideIn_.2s_ease]">
      <span className="text-lg tabular-nums font-bold text-haruto-sea">{mm}:{ss}</span>
      <span className="text-sm max-w-40 truncate">{state.title}</span>
      <span className="text-[10px] text-neutral-400">{state.mode === 'countdown' ? '倒计时' : '正计时'}</span>
      <button onClick={onToggle} className="text-sm px-3 py-1 rounded-lg bg-haruto-sea text-white">
        {state.running ? '暂停' : '继续'}
      </button>
      <button onClick={onComplete} className="text-sm px-3 py-1 rounded-lg border border-neutral-300 dark:border-neutral-600">
        完成
      </button>
      <button onClick={onAbandon} className="text-sm px-2 py-1 text-neutral-400 hover:text-red-500">
        放弃
      </button>
    </div>
  )
}
