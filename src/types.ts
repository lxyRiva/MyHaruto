export interface Task {
  id: string
  title: string
  description: string
  dueDate: string | null // YYYY-MM-DD，null = 无日期
  done: boolean
  createdAt: string
}

export interface Db {
  tasks: Task[]
  settings: { theme: 'light' | 'dark' }
}
