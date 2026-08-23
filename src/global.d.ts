import type { Db } from './types'

declare global {
  interface Window {
    myharuto: {
      getDb: () => Promise<Db>
      saveDb: (db: Db) => Promise<boolean>
    }
  }
}

export {}
