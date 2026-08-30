// 线性图标库（lucide 风格：1.5px 细线、圆角端点、无填充）——问题2：侧边栏去 emoji
import type { ReactNode } from 'react'

function I(children: ReactNode, size = 20) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

// 任务（清单三横线+圆点）
export const IconTasks = () => I(<>
  <line x1="9" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="9" y1="18" x2="21" y2="18" />
  <circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" />
</>)

// 专注（秒表）
export const IconTimer = () => I(<>
  <circle cx="12" cy="13" r="8" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="13" x2="14.5" y2="11" />
  <line x1="10" y1="2" x2="14" y2="2" />
</>)

// 月历（日历）
export const IconCalendar = () => I(<>
  <rect x="3" y="4" width="18" height="17" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
  <line x1="3" y1="10" x2="21" y2="10" />
</>)

// 习惯（圆圈对勾）
export const IconCheck = () => I(<>
  <circle cx="12" cy="12" r="10" /><polyline points="8 12.5 11 15.5 16 9.5" />
</>)

// 统计（柱状图）
export const IconChart = () => I(<>
  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  <line x1="3" y1="20" x2="21" y2="20" />
</>)

// 重要日（心形）
export const IconHeart = () => I(<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />)

// 书影（播放）
export const IconFilm = () => I(<>
  <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
</>)

// 旅行（纸飞机）
export const IconPlane = () => I(<>
  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
</>)

// Haruto（气泡）
export const IconChat = () => I(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />)

// 小镇（房子）
export const IconTown = () => I(<>
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
</>)

// 日/月主题
export const IconSun = () => I(<>
  <circle cx="12" cy="12" r="4" />
  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
  <line x1="4.2" y1="4.2" x2="5.6" y2="5.6" /><line x1="18.4" y1="18.4" x2="19.8" y2="19.8" />
  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
  <line x1="4.2" y1="19.8" x2="5.6" y2="18.4" /><line x1="18.4" y1="5.6" x2="19.8" y2="4.2" />
</>)

export const IconMoon = () => I(<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />)

// 展开箭头（子任务折叠）
export const IconChevron = ({ open }: { open: boolean }) => I(
  <polyline points={open ? '6 9 12 15 18 9' : '9 6 15 12 9 18'} />, 14
)

// 时钟（L2 最近7天入口）
export const IconClock = () => I(<>
  <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" />
</>)

// 设置（齿轮，L1 底部设置入口）
export const IconSettings = () => I(<>
  <circle cx="12" cy="12" r="3" />
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
</>)
