// 渲染端唯一数据入口（DEV_RULES §2：RF-Data-1 起，一切数据操作走 repository，
// 组件与 hooks 禁直接调 window.myharuto / IPC）。
// StorageDriver 契约见 ./types；RF-Moments 扩域时在此加域级方法，接口签名不动
import type { AppData, StorageDriver } from './types'

export const repository: StorageDriver = {
  loadAll: () => window.myharuto.getDb(),
  persist: (data: AppData) => window.myharuto.saveDb(data),
  openDataDir: () => window.myharuto.openDataDir(),
}
