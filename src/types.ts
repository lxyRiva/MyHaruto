export interface Tag {
  id: string
  name: string
  color: string // 十六进制色，如 #3d7ea6
  isSpecial: boolean // true = 年度OKR/我的愿景，排最前
}

export interface Task {
  id: string
  title: string
  description: string
  dueDate: string | null // YYYY-MM-DD，null = 无日期
  done: boolean
  createdAt: string
  tagId: string | null
  parentTaskId: string | null // 子任务指向主任务
}

export interface FocusSession {
  id: string
  taskId: string
  startedAt: string
  minutes: number // 实际专注分钟数
}

export interface Db {
  tasks: Task[]
  tags: Tag[]
  focusSessions: FocusSession[]
  settings: { theme: 'light' | 'dark' }
}
