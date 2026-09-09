import type { Db } from './shared/types'
import type { DeletionRecord } from './data/types'

declare global {
  interface Window {
    myharuto: {
      getDb: () => Promise<DbGetResult>
      saveDb: (payload: { data: Db; domains?: string[] | null; deletions?: DeletionRecord[] }) => Promise<boolean>
      openDataDir: () => Promise<boolean>
      getDataInfo: () => Promise<{ dataDir: string; isDefault: boolean }>
      changeDataDir: () => Promise<{ ok: boolean; canceled?: boolean; error?: string; dataDir?: string; requiresRestart?: boolean }>
    }
  }
}

// 与主进程 layout/store 返回结构对应；独立声明避免渲染端 import 主进程类型
type DbGetResult = {
  status: 'ok'
  data: Db
  legacyFallback?: boolean
} | {
  status: 'downgrade'
  dataVersion: number
  supportedVersion: number
}

export {}
