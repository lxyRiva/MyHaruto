// 任务派生数据（RF-P1 自 App.tsx 原样迁入）。纯派生 hook：不接收 setDb、无副作用。
import { useMemo } from 'react'
import type { Db, Task } from '../../../shared/types'
import { todayStr as dateTodayStr, localDateOf } from '../../../shared/utils/date'

export function useTaskSelectors(db: Db, selectedId: string | null) {
  const selected = db.tasks.find((t) => t.id === selectedId) ?? null
  const selectedChildren = selected ? db.tasks.filter((t) => t.parentTaskId === selected.id) : []
  const tagMap = new Map(db.tags.map((t) => [t.id, t]))
  // 本地日期（不能用 toISOString：UTC 偏移问题见 shared/utils/date.ts 头注释；RF-P3c 收口改调 date.ts）
  const now = new Date()
  const todayStr = dateTodayStr()
  const todaySessions = db.focusSessions.filter((s) => localDateOf(s.startedAt) === todayStr)
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0)
  const mainTasks = db.tasks.filter((t) => !t.parentTaskId)
  const specialTags = db.tags.filter((t) => t.isSpecial)
  const normalTags = db.tags.filter((t) => !t.isSpecial)
  const countOf = (id: string) =>
    id === 'all' ? mainTasks.filter((t) => !t.done).length
    : id === 'today' ? mainTasks.filter((t) => !t.done && (t.dueDate === todayStr || t.isPinnedToday)).length
    : mainTasks.filter((t) => t.tagId === id && !t.done).length

  // 专注分钟：按任务自身记录求和（看板卡片/列表卡片用）
  const minutesOf = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of db.focusSessions) m.set(s.taskId, (m.get(s.taskId) ?? 0) + s.minutes)
    return (id: string) => m.get(id) ?? 0
  }, [db.focusSessions])

  // 专注页任务池：符合条件的主任务 + 它们的全部子任务（子任务可独立计时，问题2）
  const focusMainIds = new Set(
    mainTasks.filter((t) => !t.done && (!t.dueDate || t.dueDate <= todayStr)).map((t) => t.id)
  )
  const focusPool = db.tasks.filter(
    (t) => !t.done && (focusMainIds.has(t.id) || (t.parentTaskId && focusMainIds.has(t.parentTaskId)))
  )

  return {
    selected, selectedChildren, tagMap, todayStr, localDateOf,
    todaySessions, todayMinutes, mainTasks, specialTags, normalTags,
    countOf, minutesOf, focusPool,
  }
}
