export interface Tag {
  id: string
  name: string
  color: string // 十六进制色，如 #3d7ea6
  isSpecial: boolean // true = 年度OKR/我的愿景，排最前
  isPinned?: boolean // H1 置顶排最前（可选字段，旧数据无需自愈）
}

// ===== 四层结构：H1清单(Tag) → H2标签(SubTag) → 看板分组(Section) → 任务(Task) =====

export interface SubTag {
  id: string
  h1TagId: string // 所属 H1 清单的 tagId
  name: string
  emoji: string // 标题第一个字符，可空字符串
  color: string // 18色之一，十六进制
  isPinned: boolean // 置顶在该H1最前
  sharedWithAI: boolean // 共享给AI
  order: number // 排序
}

export interface Section {
  id: string
  subTagId: string // 所属 H2 标签
  name: string
  order: number // 横向排序
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
  remindAt?: string | null // 提醒时刻 ISO（可选字段，旧数据 undefined 当 null；M5 接 AI 后生效，现仅保存+标记）
}

export interface TaskComment {
  id: string
  content: string
  createdAt: string // ISO 时间
  source: 'user' | 'haruto' // 谁写的
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
  sectionId: string | null // 所属看板分组（H2 下的 Section），新建任务必选
  checklistItems: ChecklistItem[] // 检查事项
  taskComments: TaskComment[] // AI留言/用户评论
  aggregated?: boolean // 看板语义：已勾选完成且被用户「聚合」进折叠区（勾选本身不移动任务位置；可选字段旧数据无需自愈）
  remindAt?: string | null // 任务提醒时刻 ISO（可选字段，旧数据 undefined 当 null；M5 接 AI 后生效）
  remindDaysBefore?: number | null // 提前提醒天数（0=当天）
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
  subTags: SubTag[] // H2 标签
  sections: Section[] // 看板分组
  focusSessions: FocusSession[]
  habits: Habit[]
  habitRecords: HabitRecord[]
  importantDays: ImportantDay[]
  periodRecords: PeriodRecord[]
  sleepRecords: SleepRecord[]
  settings: {
    theme: 'light' | 'dark'
    harutoMetDate: string // 首次启动日期，YYYY-MM-DD
    currentCharacterId: string // 当前角色，默认 'haruto'
    skinId: string // 皮肤，默认 'default'
    aiName: string // AI 角色显示名，默认 'Haruto'（应用名 MyHaruto 不变）
  }
}
