// 重要日 & 生理期数据变更（RF-P1 自 App.tsx 原样迁入，逻辑零改动）
import type { Dispatch, SetStateAction } from 'react'
import type { Db, ImportantDay } from '../../../shared/types'
import { uid } from '../../../shared/utils/id'

export function useImportantDays(db: Db, setDb: Dispatch<SetStateAction<Db>>) {
  const addImportantDay = (day: Omit<ImportantDay, 'id'>) =>
    setDb((d) => ({ ...d, importantDays: [...d.importantDays, { id: uid(), ...day }] }))

  const updateImportantDay = (id: string, patch: Partial<ImportantDay>) =>
    setDb((d) => ({ ...d, importantDays: d.importantDays.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))

  const deleteImportantDay = (id: string) =>
    setDb((d) => ({ ...d, importantDays: d.importantDays.filter((x) => x.id !== id) }))

  const markPeriod = (date: string, kind: 'start' | 'end') =>
    setDb((d) => {
      if (kind === 'start')
        return { ...d, periodRecords: [...d.periodRecords, { id: uid(), startDate: date, endDate: null }] }
      return {
        ...d,
        periodRecords: d.periodRecords.map((r) => (!r.endDate && r.startDate < date ? { ...r, endDate: date } : r)),
      }
    })

  const deletePeriod = (startDate: string) =>
    setDb((d) => ({ ...d, periodRecords: d.periodRecords.filter((p) => p.startDate !== startDate) }))

  // 恢复一条已结束的经期记录为进行中（endDate 置 null；生理期右键「恢复」用）
  const reopenPeriod = (startDate: string) =>
    setDb((d) => ({
      ...d,
      periodRecords: d.periodRecords.map((p) => (p.startDate === startDate ? { ...p, endDate: null } : p)),
    }))

  return { addImportantDay, updateImportantDay, deleteImportantDay, markPeriod, deletePeriod, reopenPeriod }
}
