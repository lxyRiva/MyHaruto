import type { Db } from './shared/types'

declare global {
  interface Window {
    myharuto: {
      getDb: () => Promise<Db>
      saveDb: (db: Db) => Promise<boolean>
    }
  }
}

export {}
