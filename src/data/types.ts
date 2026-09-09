// 存储层类型（RF-Data-1 立，RF-Data-2 扩）：AppData = 应用全量数据形状；
// StorageDriver = 存储驱动稳定接口（组件/hooks 唯一经 src/data/repository.ts 使用）。
// 后续域扩展（RF-Moments 书影/旅游等）只在此追加类型与 AppData 字段，不改接口签名
import type { Db } from '../shared/types'

export type AppData = Db

// db:get 结果：正常数据 / 降级保护（数据版本高于应用支持，拒绝加载防损坏）
export type LoadResult =
  | { status: 'ok'; data: AppData }
  | { status: 'downgrade'; dataVersion: number; supportedVersion: number }

export interface DataInfo {
  dataDir: string
  isDefault: boolean
}

export interface ChangeDirResult {
  ok: boolean
  canceled?: boolean
  error?: string
  dataDir?: string
  requiresRestart?: boolean
}

// 删除留痕单行（logs/changes.jsonl）：被删对象快照 + 时间，供误删排查（恢复不在本卡范围）
export interface DeletionRecord {
  at: string
  domain: string
  kind: string
  snapshots: unknown[]
}

export interface StorageDriver {
  loadAll: () => Promise<LoadResult>
  persist: (data: AppData) => Promise<boolean>
  openDataDir: () => Promise<boolean>
  getDataInfo: () => Promise<DataInfo>
  changeDataDir: () => Promise<ChangeDirResult>
}
