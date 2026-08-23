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
  priority?: 'none' | 'low' | 'mid' | 'high' // 优先级旗帜
  masterTaskId?: string | null // 关联归属：本任务及其子树专注时长并入该主任务
  isPinnedToday?: boolean // 手动置顶进今日
}

export interface FocusSession {
  id: string
  taskId: string
  startedAt: string
  minutes: number // 实际专注分钟数
}

export interface Habit {
  id: string
  name: string
  icon: string // emoji
  monthlyTarget: number // 月目标打卡数
  createdAt: string
}

export interface HabitRecord {
  id: string
  habitId: string
  date: string // YYYY-MM-DD
}

export interface ImportantDay {
  id: string
  title: string
  type: 'birthday' | 'festival' | 'custom'
  date: string // MM-DD（每年重复）或 YYYY-MM-DD
  repeatYearly: boolean
  remindDaysBefore: number
  note: string
  archived?: boolean // true = 已归档，主列表隐藏
}

export interface PeriodRecord {
  id: string
  startDate: string // YYYY-MM-DD
  endDate: string | null // null = 进行中
}

export interface SleepRecord {
  id: string
  date: string // YYYY-MM-DD（凌晨0-5点入睡归属前一天）
  bedtime: string // HH:MM
}

export interface Db {
  tasks: Task[]
  tags: Tag[]
  focusSessions: FocusSession[]
  habits: Habit[]
  habitRecords: HabitRecord[]
  importantDays: ImportantDay[]
  periodRecords: PeriodRecord[]
  sleepRecords: SleepRecord[]
  settings: { theme: 'light' | 'dark' }
}
