// 番茄钟状态机（RF-P1 自 App.tsx 原样迁入）：pomo/pomoTarget + 互斥锁 + 四动作
// completePomo 的 setTimeout 50ms 解锁为既有互斥设计，勿优化
import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { Db } from '../../../types'
import { uid } from '../../../shared/utils/id'

export interface Pomo {
  taskId: string
  title: string
  mode: 'countdown' | 'stopwatch'
  startedAt: number
  totalMin: number
  endAt: number // stopwatch 为 0
  remainingMs: number
  running: boolean
  swAccum: number // 正计时累计毫秒（暂停不清零）
}

export function usePomodoro(db: Db, setDb: Dispatch<SetStateAction<Db>>) {
  const [pomo, setPomo] = useState<Pomo | null>(null)
  const [pomoTarget, setPomoTarget] = useState<import('../../../types').Task | null>(null)
  const pomoCompletingRef = useRef(false) // 完成互斥锁（防双组件重复记录）

  const startPomo = (minutes: number, mode: 'countdown' | 'stopwatch' = 'countdown') => {
    if (!pomoTarget) return
    setPomo({
      taskId: pomoTarget.id, title: pomoTarget.title, mode, startedAt: Date.now(),
      totalMin: minutes, endAt: mode === 'countdown' ? Date.now() + minutes * 60000 : 0,
      remainingMs: mode === 'countdown' ? minutes * 60000 : 0, running: true, swAccum: 0,
    })
  }

  const togglePomo = () =>
    setPomo((p) => {
      if (!p) return p
      if (p.running) {
        // 暂停：记下剩余/累计
        return {
          ...p,
          running: false,
          remainingMs: p.mode === 'countdown' ? Math.max(0, p.endAt - Date.now()) : 0,
          swAccum: p.mode === 'stopwatch' ? p.swAccum + (Date.now() - p.startedAt) : 0,
        }
      }
      // 继续：从暂停点接续（正计时 startedAt 重置为现在，累计增量进 swAccum，避免双倍计数）
      return {
        ...p,
        running: true,
        endAt: p.mode === 'countdown' ? Date.now() + p.remainingMs : 0,
        startedAt: Date.now(),
      }
    })

  const completePomo = () => {
    // 互斥锁：浮动条和专注页都可能触发"到点完成"，确保只记一次
    if (pomoCompletingRef.current || !pomo) return
    pomoCompletingRef.current = true
    const minutes = Math.max(1, Math.round((Date.now() - pomo.startedAt) / 60000))
    setDb((d) => ({
      ...d,
      focusSessions: [
        { id: uid(), taskId: pomo.taskId, startedAt: new Date(pomo.startedAt).toISOString(), minutes },
        ...d.focusSessions,
      ],
    }))
    setPomo(null)
    setTimeout(() => { pomoCompletingRef.current = false }, 50)
  }

  // 放弃当前计时（收拢 App 两处内联 onAbandon，行为等价）
  const abandonPomo = () => {
    setPomo(null)
    setPomoTarget(null)
  }

  return { pomo, pomoTarget, setPomoTarget, startPomo, togglePomo, completePomo, abandonPomo }
}
