// 番茄钟底部浮动条：选时长 → 倒计时 → 结束自动计入专注记录（SPEC F1）
import { useEffect, useState } from 'react'
import type { Task } from '../types'

export interface PomodoroState {
  taskId: string
  title: string
  endAt: number // 结束时间戳(ms)
  remainingMs: number // 暂停时剩余
  running: boolean
}

export default function PomodoroBar({
  task, state, onStart, onToggle, onAbandon, onComplete,
}: {
  task: Task | null
  state: PomodoroState | null
  onStart: (taskId: string, title: string, minutes: number) => void
  onToggle: () => void
  onAbandon: () => void
  onComplete: () => void
}) {
  const [minutes, setMinutes] = useState(25)
  const [, forceTick] = useState(0)

  // 每秒刷新倒计时；到点自动完成
  useEffect(() => {
    const t = setInterval(() => {
      forceTick((n) => n + 1)
      if (state?.running && Date.now() >= state.endAt) onComplete()
    }, 1000)
    return () => clearInterval(t)
  }, [state, onComplete])

  // 还没开始：显示选时长面板
  if (!state) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-2xl shadow-lg
        bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3">
        <span className="text-sm font-medium">{task ? `🍅 ${task.title.slice(0, 12)}` : '🍅 番茄钟'}</span>
        <select
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="text-sm rounded-lg border border-neutral-200 dark:border-neutral-600
            bg-neutral-50 dark:bg-neutral-900 px-2 py-1 outline-none"
        >
          {[15, 25, 45, 60].map((m) => (
            <option key={m} value={m}>{m} 分钟</option>
          ))}
        </select>
        <button
          disabled={!task}
          onClick={() => task && onStart(task.id, task.title, minutes)}
          className="text-sm px-3 py-1 rounded-lg bg-haruto-sea text-white disabled:opacity-40"
        >
          开始专注
        </button>
      </div>
    )
  }

  // 进行中：倒计时条
  const msLeft = state.running ? Math.max(0, state.endAt - Date.now()) : state.remainingMs
  const mm = String(Math.floor(msLeft / 60000)).padStart(2, '0')
  const ss = String(Math.floor((msLeft % 60000) / 1000)).padStart(2, '0')
  const totalMs = state.running ? state.endAt : 0 // 进度环简单化：仅显示时间
  const pct = state.running
    ? Math.min(100, 100 - (msLeft / Math.max(1, (totalMs - Date.now() + msLeft))) * 100)
    : 0

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-2xl shadow-lg
      bg-white dark:bg-neutral-800 border border-haruto-sea/40 px-5 py-3 animate-[fadeSlideIn_.2s_ease]">
      <span className="text-lg tabular-nums font-bold text-haruto-sea">{mm}:{ss}</span>
      <span className="text-sm max-w-40 truncate">{state.title}</span>
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
