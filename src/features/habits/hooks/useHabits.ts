// 习惯打卡数据变更（RF-P1 自 App.tsx 原样迁入，逻辑零改动）
import type { Dispatch, SetStateAction } from 'react'
import type { Db, Habit } from '../../../shared/types'
import { uid } from '../../../shared/utils/id'

export function useHabits(db: Db, setDb: Dispatch<SetStateAction<Db>>) {
  const addHabit = (name: string, icon: string) =>
    setDb((d) => ({ ...d, habits: [...d.habits, { id: uid(), name, icon, monthlyTarget: 20, createdAt: new Date().toISOString() }] }))

  const updateHabit = (id: string, patch: Partial<Pick<Habit, 'name' | 'icon' | 'monthlyTarget'>>) =>
    setDb((d) => ({ ...d, habits: d.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) }))

  const deleteHabit = (id: string) =>
    setDb((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id), habitRecords: d.habitRecords.filter((r) => r.habitId !== id) }))

  const toggleHabitCheck = (habitId: string, date: string) =>
    setDb((d) => {
      const exists = d.habitRecords.some((r) => r.habitId === habitId && r.date === date)
      return {
        ...d,
        habitRecords: exists
          ? d.habitRecords.filter((r) => !(r.habitId === habitId && r.date === date))
          : [...d.habitRecords, { id: uid(), habitId, date }],
      }
    })

  return { addHabit, updateHabit, deleteHabit, toggleHabitCheck }
}
