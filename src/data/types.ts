// 存储层类型（RF-Data-1 立）：AppData = 应用全量数据形状；StorageDriver = 存储驱动稳定接口。
// 后续域扩展（RF-Moments 书影/旅游等）只在此追加类型与 AppData 字段，不改接口签名
import type { Db } from '../shared/types'

export type AppData = Db

export interface StorageDriver {
  loadAll: () => Promise<AppData>
  persist: (data: AppData) => Promise<boolean>
  openDataDir: () => Promise<boolean>
}
