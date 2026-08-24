// 重要日页：左栏重要日（🎂生日/🎉节日/📌自定义）竖版图文卡管理，右栏生理期迷你月历（记录 + 预测）
// 卡片：图上字下（图区 60% 内联 SVG 插画 / 文区 40% 标题+日期+倒计时胶囊），网格 2~3 列，
//       白底圆角 xl 柔和阴影，hover 轻微上浮；右键菜单（编辑/归档/删除）、已归档折叠区保留。
// 图样：每类型 2~3 个插画变体，选择索引存 localStorage（key=mh-day-style-{id}，不污染 note 数据）。
// 生理期：点击日期弹出小气泡（开始/结束确认），绝不自动测算结束——无 endDate 只标记开始日，不蔓延；
//        预测（浅红虚线）仅作显示建议。注意：经期预测只是日历推算，仅供参考，非医疗建议。
// 所有编辑均为行内表单（Electron 下禁用 prompt/alert）。
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import type { ImportantDay, PeriodRecord } from '../types'

/* ---------- 日期工具（全部走本地时区，避免 toISOString 的 UTC 偏移问题） ---------- */

// 'YYYY-MM-DD' → 本地 Date
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Date → 'YYYY-MM-DD'
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 日期加 n 天（返回新对象）
function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(d.getDate() + n)
  return r
}

// a - b 的天数差
function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000)
}

/* ---------- 重要日常量 ---------- */

// 表单里的类型选项
const TYPE_OPTIONS: { value: ImportantDay['type']; label: string }[] = [
  { value: 'birthday', label: '🎂 生日' },
  { value: 'festival', label: '🎉 节日' },
  { value: 'custom', label: '📌 自定义' },
]

// 每类型可选的插画变体数与名称（图样索引存 localStorage，不动 note 数据）
const VARIANT_COUNT: Record<ImportantDay['type'], number> = { birthday: 2, festival: 2, custom: 3 }
const VARIANT_NAMES: Record<ImportantDay['type'], string[]> = {
  birthday: ['蛋糕烛光', '纸杯蛋糕'],
  festival: ['绽放烟花', '彩带星徽'],
  custom: ['礼物盒', '星星月亮', '心愿气球'],
}

// localStorage key 前缀：mh-day-style-{id} = 图样索引
const DS_PREFIX = 'mh-day-style-'

// 五角星 path（以原点为中心、外径 r 的正五角星）
function starPath(r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2 // 顶点朝上
    const rr = i % 2 === 0 ? r : r * 0.42
    pts.push(`${i === 0 ? 'M' : 'L'}${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`)
  }
  return pts.join(' ') + ' Z'
}

/* ---------- 内联 SVG 插画：每类型多幅变体，嵌入该重要日的月-日大字 ---------- */
// 统一 viewBox 300×200、preserveAspectRatio slice：图区满铺不留白
function DayArt({
  type,
  variant,
  month,
  day,
}: {
  type: ImportantDay['type']
  variant: number
  month: number
  day: number
}) {
  const label = `${month}-${day}` // 艺术化日期大字，如 8-24
  const svgProps = {
    viewBox: '0 0 300 200',
    preserveAspectRatio: 'xMidYMid slice',
    className: 'block w-full h-full',
  } as const

  /* ---- 生日 · 变体A：双层蛋糕 + 蜡烛（暖玫红调） ---- */
  if (type === 'birthday' && variant === 0) {
    return (
      <svg {...svgProps}>
        <rect width="300" height="200" fill="#fdf1f4" />
        {/* 背景装饰圆点 */}
        <circle cx="42" cy="34" r="18" fill="#f9dce4" />
        <circle cx="262" cy="152" r="26" fill="#f9dce4" opacity="0.7" />
        <circle cx="256" cy="30" r="5" fill="#f6a5bb" />
        <circle cx="46" cy="150" r="4" fill="#f6a5bb" />
        {/* 日期大字 */}
        <text x="150" y="46" textAnchor="middle" fontSize="32" fontWeight="700" fill="#d94f6e">
          {label}
        </text>
        {/* 烛芯火苗 + 蜡烛 */}
        <ellipse cx="150" cy="62" rx="5" ry="8" fill="#f5a35c" />
        <ellipse cx="150" cy="64" rx="2.5" ry="4.5" fill="#fbd38d" />
        <rect x="145" y="70" width="10" height="30" rx="3" fill="#ffffff" stroke="#e5637f" strokeWidth="2" />
        {/* 上层蛋糕 + 奶油裱花 */}
        <rect x="112" y="98" width="76" height="32" rx="8" fill="#f6a5bb" />
        <g fill="#fbe0e8">
          <circle cx="124" cy="100" r="7" />
          <circle cx="138" cy="102" r="8" />
          <circle cx="150" cy="100" r="7" />
          <circle cx="162" cy="102" r="8" />
          <circle cx="176" cy="100" r="7" />
        </g>
        {/* 下层蛋糕 + 奶油裱花 + 撒糖 */}
        <rect x="92" y="128" width="116" height="38" rx="10" fill="#e5637f" />
        <g fill="#f6a5bb">
          <circle cx="104" cy="130" r="9" />
          <circle cx="122" cy="132" r="10" />
          <circle cx="150" cy="130" r="9" />
          <circle cx="178" cy="132" r="10" />
          <circle cx="196" cy="130" r="9" />
        </g>
        <g fill="#ffffff" opacity="0.75">
          <rect x="112" y="146" width="6" height="2.5" rx="1.25" transform="rotate(20 115 147)" />
          <rect x="148" y="150" width="6" height="2.5" rx="1.25" transform="rotate(-15 151 151)" />
          <rect x="182" y="146" width="6" height="2.5" rx="1.25" transform="rotate(30 185 147)" />
        </g>
        {/* 底盘 */}
        <ellipse cx="150" cy="168" rx="86" ry="9" fill="#f3cdd7" />
      </svg>
    )
  }

  /* ---- 生日 · 变体B：纸杯蛋糕 + 横幅日期（暖玫红调） ---- */
  if (type === 'birthday' && variant === 1) {
    return (
      <svg {...svgProps}>
        <rect width="300" height="200" fill="#fdf1f4" />
        {/* 彩屑 */}
        <g>
          <circle cx="52" cy="60" r="4" fill="#f6a5bb" />
          <circle cx="248" cy="54" r="4" fill="#e5637f" />
          <circle cx="268" cy="120" r="3" fill="#f3cdd7" />
          <circle cx="34" cy="120" r="3" fill="#f3cdd7" />
          <rect x="66" y="92" width="7" height="3" rx="1.5" fill="#f6a5bb" transform="rotate(24 70 94)" />
          <rect x="230" y="94" width="7" height="3" rx="1.5" fill="#f6a5bb" transform="rotate(-20 234 96)" />
        </g>
        {/* 日期横幅 */}
        <rect x="70" y="34" width="160" height="36" rx="18" fill="#ffffff" stroke="#e5637f" strokeWidth="2" />
        <text x="150" y="60" textAnchor="middle" fontSize="24" fontWeight="700" fill="#d94f6e">
          {label}
        </text>
        {/* 奶油裱花三球 */}
        <circle cx="118" cy="114" r="16" fill="#fbe0e8" />
        <circle cx="182" cy="114" r="16" fill="#fbe0e8" />
        <circle cx="150" cy="106" r="18" fill="#f6a5bb" />
        <circle cx="150" cy="120" r="22" fill="#f6a5bb" />
        {/* 樱桃 + 果柄 */}
        <path d="M150 82 q6 -10 12 -12" stroke="#b97e1f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="150" cy="90" r="8" fill="#d94f6e" />
        {/* 纸杯托（带竖纹） */}
        <path d="M118 132 h64 l-8 42 a6 6 0 0 1 -6 5 h-36 a6 6 0 0 1 -6 -5 z" fill="#e5637f" />
        <path d="M138 132 l4 47 M162 132 l-4 47" stroke="#d94f6e" strokeWidth="3" />
      </svg>
    )
  }

  /* ---- 节日 · 变体A：绽放烟花（琥珀金调） ---- */
  if (type === 'festival' && variant === 0) {
    return (
      <svg {...svgProps}>
        <rect width="300" height="200" fill="#fdf6e3" />
        <circle cx="44" cy="160" r="22" fill="#f7ead0" />
        <circle cx="258" cy="42" r="16" fill="#f7ead0" />
        {/* 日期大字 */}
        <text x="150" y="52" textAnchor="middle" fontSize="32" fontWeight="700" fill="#b97e1f">
          {label}
        </text>
        {/* 主烟花：8 道放射线 + 外圈光点 */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4
          return (
            <line
              key={`l${i}`}
              x1={150 + Math.cos(a) * 14}
              y1={118 + Math.sin(a) * 14}
              x2={150 + Math.cos(a) * 54}
              y2={118 + Math.sin(a) * 54}
              stroke="#e0a63d"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )
        })}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4 + Math.PI / 8
          return <circle key={`d${i}`} cx={150 + Math.cos(a) * 62} cy={118 + Math.sin(a) * 62} r="4" fill="#f5c76a" />
        })}
        <circle cx="150" cy="118" r="5" fill="#b97e1f" />
        {/* 左上 / 右上两朵小烟花 */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i * Math.PI) / 3
          return (
            <line
              key={`sl${i}`}
              x1={84 + Math.cos(a) * 6}
              y1={74 + Math.sin(a) * 6}
              x2={84 + Math.cos(a) * 26}
              y2={74 + Math.sin(a) * 26}
              stroke="#f5c76a"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )
        })}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i * Math.PI) / 3 + 0.3
          return (
            <line
              key={`sr${i}`}
              x1={224 + Math.cos(a) * 6}
              y1={66 + Math.sin(a) * 6}
              x2={224 + Math.cos(a) * 24}
              y2={66 + Math.sin(a) * 24}
              stroke="#e0a63d"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )
        })}
        {/* 底部散落星星 */}
        <path d={starPath(9)} transform="translate(60,152)" fill="#f5c76a" />
        <path d={starPath(7)} transform="translate(242,150)" fill="#e0a63d" />
        <path d={starPath(6)} transform="translate(200,170)" fill="#f5c76a" />
      </svg>
    )
  }

  /* ---- 节日 · 变体B：彩带 + 星徽日期（琥珀金调） ---- */
  if (type === 'festival' && variant === 1) {
    return (
      <svg {...svgProps}>
        <rect width="300" height="200" fill="#fdf6e3" />
        {/* 飘舞彩带 */}
        <path d="M-10 44 C 60 10, 130 74, 200 40 S 300 22, 320 48" stroke="#f5c76a" strokeWidth="6" fill="none" opacity="0.9" />
        <path d="M-10 156 C 70 126, 140 184, 210 148 S 300 130, 320 156" stroke="#e0a63d" strokeWidth="5" fill="none" opacity="0.85" />
        {/* 散落星星 */}
        <path d={starPath(10)} transform="translate(52,102)" fill="#e0a63d" />
        <path d={starPath(12)} transform="translate(250,100)" fill="#e0a63d" />
        <path d={starPath(7)} transform="translate(84,160)" fill="#f5c76a" />
        <path d={starPath(6)} transform="translate(222,158)" fill="#f5c76a" />
        <circle cx="60" cy="40" r="3" fill="#e0a63d" />
        <circle cx="240" cy="40" r="3" fill="#f5c76a" />
        {/* 中央星徽徽章：白底 + 金环 + 虚线内圈，日期居中 */}
        <circle cx="150" cy="102" r="48" fill="#ffffff" stroke="#e0a63d" strokeWidth="2.5" />
        <circle cx="150" cy="102" r="40" fill="none" stroke="#f5c76a" strokeWidth="1.5" strokeDasharray="4 5" />
        <text x="150" y="112" textAnchor="middle" fontSize="28" fontWeight="700" fill="#b97e1f">
          {label}
        </text>
      </svg>
    )
  }

  /* ---- 自定义 · 变体A：礼物盒 + 蝴蝶结（海蓝调） ---- */
  if (type === 'custom' && variant === 0) {
    return (
      <svg {...svgProps}>
        <rect width="300" height="200" fill="#eaf2f7" />
        {/* 光斑十字星 */}
        <path d="M56 60 v-16 M48 52 h16" stroke="#7fb3d0" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M246 74 v-14 M239 67 h14" stroke="#7fb3d0" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="40" cy="140" r="4" fill="#7fb3d0" />
        <circle cx="260" cy="150" r="5" fill="#9cc3da" />
        {/* 日期大字 */}
        <text x="150" y="58" textAnchor="middle" fontSize="32" fontWeight="700" fill="#2c5f80">
          {label}
        </text>
        {/* 蝴蝶结双耳 */}
        <ellipse cx="134" cy="86" rx="14" ry="9" fill="none" stroke="#2c5f80" strokeWidth="5" transform="rotate(-22 134 86)" />
        <ellipse cx="166" cy="86" rx="14" ry="9" fill="none" stroke="#2c5f80" strokeWidth="5" transform="rotate(22 166 86)" />
        {/* 盒盖 + 盒身 */}
        <rect x="96" y="92" width="108" height="20" rx="6" fill="#2c5f80" />
        <rect x="104" y="112" width="92" height="52" rx="8" fill="#3d7ea6" />
        {/* 缎带（纵） */}
        <rect x="142" y="92" width="16" height="72" fill="#eaf2f7" opacity="0.95" />
        {/* 盒身高光点 */}
        <circle cx="120" cy="130" r="2.5" fill="#eaf2f7" opacity="0.8" />
        <circle cx="126" cy="138" r="2" fill="#eaf2f7" opacity="0.6" />
        <circle cx="180" cy="146" r="2.5" fill="#eaf2f7" opacity="0.8" />
      </svg>
    )
  }

  /* ---- 自定义 · 变体B：星星与月亮（海蓝调） ---- */
  if (type === 'custom' && variant === 1) {
    return (
      <svg {...svgProps}>
        <rect width="300" height="200" fill="#eaf2f7" />
        {/* 小星点 */}
        <circle cx="58" cy="48" r="3" fill="#7fb3d0" />
        <circle cx="246" cy="150" r="3.5" fill="#7fb3d0" />
        <circle cx="232" cy="52" r="2.5" fill="#9cc3da" />
        <circle cx="66" cy="150" r="2.5" fill="#9cc3da" />
        {/* 日期大字 */}
        <text x="150" y="46" textAnchor="middle" fontSize="30" fontWeight="700" fill="#2c5f80">
          {label}
        </text>
        {/* 大星 + 伴星（微旋转错落） */}
        <path d={starPath(40)} transform="translate(122,118) rotate(-12)" fill="#3d7ea6" />
        <path d={starPath(18)} transform="translate(178,86)" fill="#7fb3d0" />
        {/* 弯月（双弧相减成形） */}
        <path d="M236 84 a32 32 0 1 0 0 60 a25 25 0 1 1 0 -60 z" fill="#7fb3d0" opacity="0.9" />
        {/* 底部细线装饰 */}
        <path d="M92 166 h116" stroke="#7fb3d0" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 8" />
      </svg>
    )
  }

  /* ---- 自定义 · 变体C：心愿气球（海蓝调） ---- */
  // 球身嵌日期白字，飘带尾线
  return (
    <svg {...svgProps}>
      <rect width="300" height="200" fill="#eaf2f7" />
      {/* 小星点 */}
      <circle cx="54" cy="80" r="3" fill="#7fb3d0" />
      <circle cx="250" cy="70" r="3.5" fill="#7fb3d0" />
      <path d={starPath(8)} transform="translate(72,44)" fill="#9cc3da" />
      <path d={starPath(7)} transform="translate(236,128)" fill="#9cc3da" />
      {/* 气球球身 + 高光 */}
      <ellipse cx="150" cy="92" rx="46" ry="54" fill="#3d7ea6" />
      <ellipse cx="134" cy="70" rx="10" ry="17" fill="#ffffff" opacity="0.35" />
      {/* 球身内嵌日期白字 */}
      <text x="150" y="102" textAnchor="middle" fontSize="28" fontWeight="700" fill="#ffffff">
        {label}
      </text>
      {/* 结扣 + 飘带尾线 */}
      <path d="M144 146 l6 9 l6 -9 z" fill="#2c5f80" />
      <path d="M150 155 q-14 14 0 27 q14 13 0 14" stroke="#7fb3d0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// 图样选择器：当前类型可选变体的缩略图（表单共用）
function VariantPicker({
  type,
  value,
  onChange,
  sample,
}: {
  type: ImportantDay['type']
  value: number
  onChange: (v: number) => void
  sample: [number, number] // 缩略图里演示用的 [月, 日]
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-neutral-500 select-none">图样</span>
      {Array.from({ length: VARIANT_COUNT[type] }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          title={VARIANT_NAMES[type][i]}
          className={`w-16 h-11 rounded-md overflow-hidden border transition-all
            ${
              value === i
                ? 'border-haruto-sea ring-1 ring-haruto-sea'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
            }`}
        >
          <DayArt type={type} variant={i} month={sample[0]} day={sample[1]} />
        </button>
      ))}
    </div>
  )
}

// 从存储的 date（每年重复为 MM-DD，否则 YYYY-MM-DD，见 types.ts 约定）取 [月, 日]
function monthDayOf(date: string): [number, number] {
  const md = date.length === 5 ? date : date.slice(5)
  const [m, d] = md.split('-').map(Number)
  return [m, d]
}

// 计算重要日「下一次发生」的日期：每年重复取今年（已过则顺延到明年）的 MM-DD，否则原日期
// 用于「按日期临近排序」；平年的 2月29日 会被 Date 构造器自动顺延到 3月1日
function nextOccur(day: ImportantDay, todayStart: Date): Date {
  if (!day.repeatYearly) return parseDate(day.date)
  const [m, d] = monthDayOf(day.date)
  const thisYear = new Date(todayStart.getFullYear(), m - 1, d)
  return thisYear.getTime() < todayStart.getTime()
    ? new Date(todayStart.getFullYear() + 1, m - 1, d)
    : thisYear
}

// 右键菜单状态（屏幕坐标，fixed 定位浮层）
interface MenuState {
  id: string
  x: number
  y: number
}

// 生理期小气泡弹窗状态：kind = start(问开始) / end(问结束) / info(仅提示)
interface PopState {
  date: string
  x: number
  y: number
  side: 'left' | 'right' // 气泡锚在日期格的哪一侧（决定小箭头位置）
  kind: 'start' | 'end' | 'info'
  info?: string // kind=info 时的提示文案
}

// 编辑表单草稿（回填现有值）
interface EditDraft {
  title: string
  type: ImportantDay['type']
  date: string // 完整 YYYY-MM-DD（每年重复的项用「下一次发生」的年份回填）
  repeatYearly: boolean
  remindDaysBefore: number
  note: string
}

// 右键菜单里的单个选项按钮
function ContextButton({ children, onClick, danger }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-xs transition-colors
        ${
          danger
            ? 'text-red-500 hover:bg-red-500/10'
            : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'
        }`}
    >
      {children}
    </button>
  )
}

export default function ImportantDays({
  importantDays,
  periodRecords,
  onAddDay,
  onUpdateDay,
  onDeleteDay,
  onPeriodMark,
}: {
  importantDays: ImportantDay[]
  periodRecords: PeriodRecord[]
  onAddDay: (d: Omit<ImportantDay, 'id'>) => void
  onUpdateDay: (id: string, patch: Partial<ImportantDay>) => void
  onDeleteDay: (id: string) => void
  onPeriodMark: (date: string, kind: 'start' | 'end') => void // 标记经期开始/结束
}) {
  /* ---------- 左栏：添加表单状态 ---------- */
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ImportantDay['type']>('custom')
  const [date, setDate] = useState('')
  const [repeatYearly, setRepeatYearly] = useState(false)
  const [remindDays, setRemindDays] = useState(7) // 提前提醒天数，默认 7
  const [newStyle, setNewStyle] = useState(0) // 新建时选的图样索引，默认 0

  /* ---------- 左栏：右键菜单 / 行内编辑 / 归档折叠 ---------- */
  const [menu, setMenu] = useState<MenuState | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EditDraft | null>(null)
  const [editStyle, setEditStyle] = useState(0) // 编辑表单里的图样索引（localStorage）
  const [archivedOpen, setArchivedOpen] = useState(false)

  /* ---------- 图样索引（localStorage 持久化，不污染 note 数据） ---------- */
  const [styleMap, setStyleMap] = useState<Record<string, number>>({})
  // 挂载时读回全部图样索引
  useEffect(() => {
    try {
      const out: Record<string, number> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k || !k.startsWith(DS_PREFIX)) continue
        const n = Number(localStorage.getItem(k))
        if (n >= 0) out[k.slice(DS_PREFIX.length)] = n
      }
      setStyleMap(out)
    } catch {
      /* localStorage 不可用时静默降级为默认图样 */
    }
  }, [])
  // 写入 / 删除某个重要日的图样索引
  const setDayStyle = (id: string, v: number) => {
    try {
      if (v > 0) localStorage.setItem(DS_PREFIX + id, String(v))
      else localStorage.removeItem(DS_PREFIX + id) // 0 = 默认，清掉 key 保持整洁
    } catch {
      /* 忽略写入失败 */
    }
    setStyleMap((p) => {
      const next = { ...p }
      if (v > 0) next[id] = v
      else delete next[id]
      return next
    })
  }

  /* ---------- 新建重要日后落地图样（onAddDay 不返回 id，靠新增 id 检测） ---------- */
  const pendingStyleRef = useRef<number | null>(null)
  const knownDayIdsRef = useRef<Set<string> | null>(null)
  useEffect(() => {
    const prev = knownDayIdsRef.current
    const ids = new Set(importantDays.map((d) => d.id))
    knownDayIdsRef.current = ids
    const pending = pendingStyleRef.current
    if (pending == null || prev == null) return
    pendingStyleRef.current = null
    const fresh = importantDays.find((d) => !prev.has(d.id))
    if (fresh && pending > 0) setDayStyle(fresh.id, pending)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importantDays])

  /* ---------- 右栏：月历视图状态 / 生理期小气泡 ---------- */
  const [view, setView] = useState(() => {
    const n = new Date()
    return { y: n.getFullYear(), m: n.getMonth() }
  })
  const [pop, setPop] = useState<PopState | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)

  const now = new Date()
  const todayStr = fmtDate(now)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  /* ---------- 左栏：列表（已归档不进主列表；按下一次发生日期临近排序） ---------- */
  const activeDays = importantDays.filter((d) => !d.archived)
  const archivedDays = importantDays.filter((d) => d.archived)
  const sortedDays = [...activeDays].sort(
    (a, b) => nextOccur(a, todayStart).getTime() - nextOccur(b, todayStart).getTime()
  )

  // 从表单日期字符串取缩略图演示用的 [月, 日]（非法则回退到今天）
  const formMD = (s: string): [number, number] => {
    const md = s.length === 5 ? s : s.slice(5)
    const [m, d] = md.split('-').map(Number)
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return [m, d]
    return [now.getMonth() + 1, now.getDate()]
  }

  const canSave = title.trim() !== '' && date !== ''
  const handleSave = () => {
    if (!canSave) return
    onAddDay({
      title: title.trim(),
      type,
      date: repeatYearly ? date.slice(5) : date, // 每年重复按约定只存 MM-DD
      repeatYearly,
      remindDaysBefore: remindDays,
      note: '',
    })
    pendingStyleRef.current = newStyle // 创建后由上面的 effect 把图样索引写入 localStorage
    // 保存后重置并收起表单
    setTitle('')
    setDate('')
    setType('custom')
    setRepeatYearly(false)
    setRemindDays(7)
    setNewStyle(0)
    setAdding(false)
  }

  /* ---------- 右键菜单：打开 / 关闭 ---------- */
  const openMenu = (e: ReactMouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setPop(null) // 菜单与气泡互斥
    setMenu({
      id,
      x: Math.max(8, Math.min(e.clientX, window.innerWidth - 170)), // 防溢出屏幕
      y: Math.max(8, Math.min(e.clientY, window.innerHeight - 180)),
    })
  }

  // 点击菜单外 / Esc 关闭
  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  // 点击气泡外 / Esc 关闭
  useEffect(() => {
    if (!pop) return
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setPop(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPop(null)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [pop])

  /* ---------- 行内编辑：回填现有值（每年重复的 MM-DD 补上下一次发生的年份供 date 输入框用） ---------- */
  const startEdit = (d: ImportantDay) => {
    setMenu(null)
    setEditingId(d.id)
    setDraft({
      title: d.title,
      type: d.type,
      date: d.repeatYearly ? fmtDate(nextOccur(d, todayStart)) : d.date,
      repeatYearly: d.repeatYearly,
      remindDaysBefore: d.remindDaysBefore,
      note: d.note,
    })
    setEditStyle(Math.min(styleMap[d.id] ?? 0, VARIANT_COUNT[d.type] - 1)) // 图样索引一并回填
  }
  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
  }
  const canSaveDraft = !!draft && draft.title.trim() !== '' && draft.date !== ''
  const saveEdit = () => {
    if (!editingId || !draft || !canSaveDraft) return
    onUpdateDay(editingId, {
      title: draft.title.trim(),
      type: draft.type,
      date: draft.repeatYearly ? draft.date.slice(5) : draft.date, // 每年重复只存 MM-DD
      repeatYearly: draft.repeatYearly,
      remindDaysBefore: draft.remindDaysBefore,
      note: draft.note,
    })
    setDayStyle(editingId, editStyle) // 图样选择存 localStorage（不污染 note）
    cancelEdit()
  }

  /* ---------- 右栏：经期记录与预测 ---------- */
  // 未结束的经期记录（endDate 为空）：只在开始日做标记，绝不自动测算结束日期
  const openRecord = periodRecords.find((r) => !r.endDate) ?? null

  // 某日期是否被已结束的记录覆盖
  const isRecorded = (s: string) =>
    periodRecords.some((r) => r.endDate && r.startDate <= s && s <= r.endDate)

  // —— 预测算法（纯日历推算，非医疗建议；仅作为显示建议，不作任何自动写入）——
  // 取最近最多 6 条记录：
  //   平均周期 = 相邻 startDate 差的均值（不足 2 条默认 28 天）
  //   平均经期长度 = (endDate - startDate + 1) 的均值（无完整记录默认 5 天）
  // 下次预测 = 最近一条 startDate + 平均周期，向后覆盖平均经期长度天
  const byStart = [...periodRecords].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const recent = byStart.slice(-6)
  const withEnd = recent.filter((r) => r.endDate)
  const avgCycle =
    recent.length >= 2
      ? Math.max(
          1,
          Math.round(
            recent.slice(1).reduce(
              (sum, r, i) => sum + diffDays(parseDate(r.startDate), parseDate(recent[i].startDate)),
              0
            ) / (recent.length - 1)
          )
        )
      : 28
  const avgLen = withEnd.length
    ? Math.max(
        1,
        Math.round(
          withEnd.reduce((sum, r) => sum + diffDays(parseDate(r.endDate!), parseDate(r.startDate)) + 1, 0) /
            withEnd.length
        )
      )
    : 5
  const predicted = new Set<string>()
  const latest = recent[recent.length - 1]
  if (latest) {
    const start = addDays(parseDate(latest.startDate), avgCycle)
    for (let i = 0; i < avgLen; i++) predicted.add(fmtDate(addDays(start, i)))
  }

  // 单元格状态：开始日待结束（更深红，仅开始日一天）> 已记录（浅红）> 预测（极浅红虚线）
  const statusOf = (s: string): 'open' | 'recorded' | 'predicted' | 'none' => {
    if (openRecord && s === openRecord.startDate) return 'open'
    if (isRecorded(s)) return 'recorded'
    if (predicted.has(s)) return 'predicted'
    return 'none'
  }

  /* ---------- 点击日期 → 弹出小气泡确认（锚定在该格旁边） ---------- */
  // 有未结束记录：点其后日期 = 问「结束」；点开始日本身 / 更早日期 = 提示
  // 无未结束记录：点已记录日期 = 提示；点未记录日期 = 问「开始」
  const handleCellClick = (e: ReactMouseEvent<HTMLButtonElement>, s: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const W = 196 // 气泡预估宽度
    const H = 116 // 气泡预估高度
    let side: 'left' | 'right' = 'right'
    let x = rect.right + 10
    if (x + W > window.innerWidth - 8) {
      x = Math.max(8, rect.left - W - 10) // 右侧放不下 → 翻到左侧
      side = 'left'
    }
    const y = Math.max(8, Math.min(rect.top + rect.height / 2 - H / 2, window.innerHeight - H - 8))
    const pos = { date: s, x, y, side }

    if (openRecord) {
      if (s > openRecord.startDate) {
        setPop({ ...pos, kind: 'end' }) // 另点一个日期 → 问结束
        return
      }
      if (s === openRecord.startDate) {
        setPop({ ...pos, kind: 'info', info: '该日已记录为经期开始，等待记录结束' })
        return
      }
      setPop({ ...pos, kind: 'info', info: `已有开始于 ${openRecord.startDate} 的未结束记录` })
      return
    }
    if (isRecorded(s)) {
      setPop({ ...pos, kind: 'info', info: '该日期已在经期记录内' })
      return
    }
    setPop({ ...pos, kind: 'start' }) // 常规：问开始
  }

  /* ---------- 月历几何 ---------- */
  const firstWeekday = new Date(view.y, view.m, 1).getDay() // 该月 1 号是周几（0 = 周日）
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  // 切月（自动处理跨年，同时收起气泡）
  const shiftMonth = (delta: number) => {
    setPop(null)
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }
  // 「今天」回位到当前月份
  const goToday = () => {
    const n = new Date()
    setPop(null)
    setView({ y: n.getFullYear(), m: n.getMonth() })
  }

  const menuDay = menu ? importantDays.find((d) => d.id === menu.id) : undefined

  return (
    <div className="p-6 flex gap-6">
      {/* ===== 左栏：重要日图文卡片 ===== */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold">重要日</h1>
          <span className="text-[10px] text-neutral-400">右键卡片可编辑 / 归档 / 删除</span>
        </div>

        {/* 添加按钮 → 内联表单（标题 + 类型 + 日期 + 图样 + 每年重复 + 提前提醒天数） */}
        {adding ? (
          <div
            className="task-item mt-4 rounded-xl border border-neutral-200 dark:border-neutral-700
              bg-white dark:bg-neutral-900 p-4"
          >
            <div className="flex gap-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') setAdding(false)
                }}
                placeholder="标题，如：妈妈生日"
                className="flex-1 min-w-0 rounded-lg border border-neutral-200 dark:border-neutral-700
                  bg-transparent px-3 py-2 text-sm outline-none focus:border-haruto-sea"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-neutral-200 dark:border-neutral-700
                  bg-transparent px-3 py-2 text-sm outline-none focus:border-haruto-sea"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* 类型选择（切换类型时图样越界则归零） */}
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    setType(t.value)
                    if (newStyle >= VARIANT_COUNT[t.value]) setNewStyle(0)
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                    ${
                      type === t.value
                        ? 'border-haruto-sea bg-haruto-sea/10 text-haruto-sea font-medium'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400'
                    }`}
                >
                  {t.label}
                </button>
              ))}
              {/* 每年重复 */}
              <label className="flex items-center gap-1.5 text-xs text-neutral-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={repeatYearly}
                  onChange={(e) => setRepeatYearly(e.target.checked)}
                  className="accent-haruto-sea w-3.5 h-3.5"
                />
                每年重复
              </label>
              {/* 提前提醒天数（默认 7） */}
              <label className="flex items-center gap-1.5 text-xs text-neutral-500 select-none">
                提前
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={remindDays}
                  onChange={(e) => setRemindDays(Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
                  className="w-14 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent
                    px-2 py-1 text-xs text-center tabular-nums outline-none focus:border-haruto-sea"
                />
                天提醒
              </label>
            </div>
            {/* 图样选择（随所选日期实时预览日期大字） */}
            <div className="mt-2.5">
              <VariantPicker type={type} value={newStyle} onChange={setNewStyle} sample={formMD(date)} />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setAdding(false)}
                className="text-xs px-3 py-1.5 rounded-lg text-neutral-400
                  hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-colors
                  ${
                    canSave
                      ? 'bg-haruto-sea text-white hover:opacity-90'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
                  }`}
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-4 w-full rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600
              py-2.5 text-sm text-neutral-400 hover:border-haruto-sea hover:text-haruto-sea transition-colors"
          >
            ＋ 添加重要日
          </button>
        )}

        {/* 原地编辑表单（回填现有值 + 图样选择；保存在 onUpdateDay，图样入 localStorage） */}
        {editingId && draft && (
          <div className="task-item mt-4 rounded-xl border border-haruto-sea/40 bg-white dark:bg-neutral-900 p-4">
            <div className="flex gap-2">
              <input
                autoFocus
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit()
                  if (e.key === 'Escape') cancelEdit()
                }}
                placeholder="标题"
                className="flex-1 min-w-0 rounded-lg border border-neutral-200 dark:border-neutral-700
                  bg-transparent px-3 py-2 text-sm outline-none focus:border-haruto-sea"
              />
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="rounded-lg border border-neutral-200 dark:border-neutral-700
                  bg-transparent px-3 py-2 text-sm outline-none focus:border-haruto-sea"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    setDraft({ ...draft, type: t.value })
                    if (editStyle >= VARIANT_COUNT[t.value]) setEditStyle(0) // 类型切换后图样越界归零
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                    ${
                      draft.type === t.value
                        ? 'border-haruto-sea bg-haruto-sea/10 text-haruto-sea font-medium'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400'
                    }`}
                >
                  {t.label}
                </button>
              ))}
              <label className="flex items-center gap-1.5 text-xs text-neutral-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={draft.repeatYearly}
                  onChange={(e) => setDraft({ ...draft, repeatYearly: e.target.checked })}
                  className="accent-haruto-sea w-3.5 h-3.5"
                />
                每年重复
              </label>
              <label className="flex items-center gap-1.5 text-xs text-neutral-500 select-none">
                提前
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={draft.remindDaysBefore}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      remindDaysBefore: Math.max(0, Math.min(90, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-14 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent
                    px-2 py-1 text-xs text-center tabular-nums outline-none focus:border-haruto-sea"
                />
                天提醒
              </label>
            </div>
            <div className="mt-2.5">
              <VariantPicker type={draft.type} value={editStyle} onChange={setEditStyle} sample={formMD(draft.date)} />
            </div>
            <input
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="备注（可选）"
              className="mt-2.5 w-full rounded-lg border border-neutral-200 dark:border-neutral-700
                bg-transparent px-3 py-2 text-xs outline-none focus:border-haruto-sea"
            />
            <div className="mt-2.5 flex justify-end gap-2">
              <button
                onClick={cancelEdit}
                className="text-xs px-3 py-1.5 rounded-lg text-neutral-400
                  hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                disabled={!canSaveDraft}
                className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-colors
                  ${
                    canSaveDraft
                      ? 'bg-haruto-sea text-white hover:opacity-90'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
                  }`}
              >
                保存
              </button>
            </div>
          </div>
        )}

        {/* 重要日卡片网格：图上字下（60/40），白底圆角柔和阴影，hover 上浮；右键呼出菜单 */}
        <div className="mt-4 grid grid-cols-2 2xl:grid-cols-3 gap-3">
          {sortedDays
            .filter((d) => d.id !== editingId) // 编辑中的卡片由上方表单代替
            .map((d) => {
              const [mo, dy] = monthDayOf(d.date)
              const daysLeft = diffDays(nextOccur(d, todayStart), todayStart)
              const styleIdx = Math.min(styleMap[d.id] ?? 0, VARIANT_COUNT[d.type] - 1) // 图样索引（默认 0）
              return (
                <div
                  key={d.id}
                  onContextMenu={(e) => openMenu(e, d.id)}
                  title="右键：编辑 / 归档 / 删除"
                  className="task-item group relative h-[225px] rounded-xl overflow-hidden cursor-default
                    border border-neutral-200/70 dark:border-neutral-700/60 bg-white dark:bg-neutral-900
                    shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* 图区（上 60%）：内联 SVG 插画，嵌入日期大字 */}
                  <div className="h-[60%] overflow-hidden">
                    <DayArt type={d.type} variant={styleIdx} month={mo} day={dy} />
                  </div>
                  {/* 文区（下 40%）：标题（14px 粗体）→ 日期（12px 灰）→ 倒计时胶囊 */}
                  <div className="h-[40%] px-3 pt-2 pb-2.5 flex flex-col min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-sm font-bold truncate">{d.title}</span>
                      {d.repeatYearly && (
                        <span className="shrink-0 text-[10px]" title="每年重复">
                          🔁
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-400 tabular-nums select-none">
                      {d.repeatYearly ? `每年 ${mo}月${dy}日` : d.date}
                    </div>
                    {/* 底部徽章：主题色底白字圆角胶囊（今天 = 玫红以示庆祝，已过 = 中性灰） */}
                    <div className="mt-auto">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] text-white select-none
                          ${
                            daysLeft === 0
                              ? 'bg-[#d94f6e] font-semibold'
                              : daysLeft > 0
                                ? 'bg-haruto-sea'
                                : 'bg-neutral-400 dark:bg-neutral-600'
                          }`}
                      >
                        {daysLeft === 0 ? '🎉 就是今天' : daysLeft > 0 ? `还有 ${daysLeft} 天` : `已过 ${-daysLeft} 天`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          {!sortedDays.length && (
            <div className="col-span-full py-8 text-center text-sm text-neutral-300 dark:text-neutral-600">
              还没有重要日，添加一个吧
            </div>
          )}
        </div>

        {/* 已归档折叠区：恢复 / 删除 */}
        {archivedDays.length > 0 && (
          <div className="mt-5">
            <button
              onClick={() => setArchivedOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs text-neutral-400
                hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors select-none"
            >
              <span className={`inline-block transition-transform duration-200 ${archivedOpen ? 'rotate-90' : ''}`}>
                ▸
              </span>
              已归档 ({archivedDays.length})
            </button>
            {archivedOpen && (
              <div className="task-item mt-2 flex flex-col gap-1.5">
                {archivedDays.map((d) => {
                  const [mo, dy] = monthDayOf(d.date)
                  const styleIdx = Math.min(styleMap[d.id] ?? 0, VARIANT_COUNT[d.type] - 1)
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-dashed
                        border-neutral-200 dark:border-neutral-700 bg-black/[0.02] dark:bg-white/[0.02]"
                    >
                      {/* 小图样缩略图（替代原 emoji 方块） */}
                      <span className="w-12 h-9 shrink-0 rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-700">
                        <DayArt type={d.type} variant={styleIdx} month={mo} day={dy} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{d.title}</div>
                        <div className="mt-0.5 text-[10px] text-neutral-400 tabular-nums">
                          {d.repeatYearly ? `每年 ${mo}月${dy}日` : d.date}
                        </div>
                      </div>
                      <button
                        onClick={() => onUpdateDay(d.id, { archived: false })}
                        className="shrink-0 text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-600
                          text-neutral-500 hover:border-haruto-sea hover:text-haruto-sea transition-colors"
                      >
                        恢复
                      </button>
                      <button
                        onClick={() => onDeleteDay(d.id)}
                        className="shrink-0 text-xs px-2 py-1 rounded-lg text-red-400 hover:text-red-500 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== 右栏：生理期迷你月历（点日期弹气泡记录开始/结束，预测仅显示建议） ===== */}
      <aside
        className="w-[340px] shrink-0 rounded-xl border border-neutral-200 dark:border-neutral-700
          bg-white dark:bg-neutral-900 p-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">生理期</h2>
          {/* 「今天」回位 */}
          <button
            onClick={goToday}
            className="text-xs px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700
              text-neutral-500 hover:border-haruto-sea hover:text-haruto-sea transition-colors"
          >
            今天
          </button>
        </div>

        {/* 切月：« 2026年8月 » */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            onClick={() => shiftMonth(-1)}
            title="上个月"
            className="w-7 h-7 rounded-full text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10
              hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            «
          </button>
          <span className="min-w-[80px] text-center text-sm font-medium tabular-nums">
            {view.y}年{view.m + 1}月
          </span>
          <button
            onClick={() => shiftMonth(1)}
            title="下个月"
            className="w-7 h-7 rounded-full text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10
              hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            »
          </button>
        </div>

        {/* 星期表头（日~六） */}
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-400">
          {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
            <span key={w} className="py-1">
              {w}
            </span>
          ))}
        </div>

        {/* 日期格子：点击弹出气泡确认开始/结束（不再直接标记） */}
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const s = fmtDate(new Date(view.y, view.m, day))
            const st = statusOf(s)
            const isToday = s === todayStr
            return (
              <button
                key={s}
                onClick={(e) => handleCellClick(e, s)}
                title={
                  st === 'open'
                    ? '该日已记录经期开始（待记录结束）'
                    : st === 'recorded'
                      ? '已记录'
                      : st === 'predicted'
                        ? '预测（仅供参考）'
                        : '点击记录开始/结束'
                }
                className={`h-9 rounded-lg flex items-center justify-center text-xs tabular-nums
                  transition-transform duration-200 hover:scale-105
                  ${
                    st === 'open'
                      ? 'bg-[#ee8888] text-neutral-800'
                      : st === 'recorded'
                        ? 'bg-[#f4a6a6] text-neutral-800'
                        : st === 'predicted'
                          ? 'bg-[#fce8e8] border border-dashed border-red-200 text-neutral-600'
                          : 'text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
              >
                {/* 今天：海蓝圆底白字 */}
                <span
                  className={`flex items-center justify-center rounded-full ${
                    isToday ? 'w-6 h-6 bg-haruto-sea text-white' : ''
                  }`}
                >
                  {day}
                </span>
              </button>
            )
          })}
        </div>

        {/* 底部图例：已记录 / 预测 + 操作提示 */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-neutral-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[4px] bg-[#f4a6a6]" />
            已记录
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[4px] bg-[#fce8e8] border border-dashed border-red-200" />
            预测
          </span>
          <span>点击日期记录开始/结束</span>
        </div>
        {/* 免责说明 */}
        <div className="mt-1.5 text-[10px] text-neutral-400">预测为日历推算，非医疗建议</div>
      </aside>

      {/* ===== 生理期小气泡弹窗（锚定日期格旁，点击别处 / Esc 关闭） ===== */}
      {pop && (
        <div
          ref={popRef}
          className="task-item fixed z-50 w-48 rounded-xl border border-neutral-200 dark:border-neutral-700
            bg-white dark:bg-neutral-800 shadow-xl p-3"
          style={{ left: pop.x, top: pop.y }}
        >
          {/* 气泡小箭头（指向日期格一侧） */}
          <span
            className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-white dark:bg-neutral-800
              ${
                pop.side === 'right'
                  ? '-left-[5px] border-l border-t border-neutral-200 dark:border-neutral-700'
                  : '-right-[5px] border-r border-b border-neutral-200 dark:border-neutral-700'
              }`}
          />
          {/* 问题 / 提示标题 */}
          <div className="text-xs font-medium select-none">
            {pop.kind === 'start' ? '月经开始了吗？' : pop.kind === 'end' ? '月经结束了吗？' : '提示'}
          </div>
          {/* 日期 / 提示正文 */}
          <div className="mt-0.5 text-[10px] text-neutral-400 tabular-nums select-none">
            {pop.kind === 'info' ? pop.info : pop.date}
          </div>
          {/* 两个开关按钮：开始|取消 / 结束|取消 / 知道啦 */}
          <div className="mt-2.5 flex gap-2">
            {pop.kind !== 'info' && (
              <button
                onClick={() => {
                  // start = 记录该日为 startDate；end = 记 endDate（info 分支不会渲染本按钮）
                  onPeriodMark(pop.date, pop.kind === 'end' ? 'end' : 'start')
                  setPop(null)
                }}
                className="flex-1 text-xs py-1.5 rounded-lg bg-[#d94f6e] text-white font-medium
                  hover:opacity-90 transition-opacity select-none"
              >
                {pop.kind === 'start' ? '开始' : '结束'}
              </button>
            )}
            <button
              onClick={() => setPop(null)}
              className={`text-xs py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600
                text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors select-none
                ${pop.kind !== 'info' ? 'flex-1' : 'w-full'}`}
            >
              {pop.kind === 'info' ? '知道啦' : '取消'}
            </button>
          </div>
        </div>
      )}

      {/* ===== 右键菜单浮层：编辑 / 归档 / 删除（点击别处 / Esc 关闭） ===== */}
      {menu && menuDay && (
        <div
          ref={menuRef}
          className="task-item fixed z-50 w-36 rounded-xl border border-neutral-200 dark:border-neutral-700
            bg-white dark:bg-neutral-800 shadow-xl py-1.5"
          style={{ left: menu.x, top: menu.y }}
        >
          <ContextButton onClick={() => startEdit(menuDay)}>✏️ 编辑</ContextButton>
          <ContextButton
            onClick={() => {
              onUpdateDay(menuDay.id, { archived: true })
              setMenu(null)
            }}
          >
            📦 归档
          </ContextButton>
          <div className="my-1 h-px bg-neutral-100 dark:bg-neutral-700/60" />
          <ContextButton
            danger
            onClick={() => {
              onDeleteDay(menuDay.id)
              setMenu(null)
            }}
          >
            🗑 删除
          </ContextButton>
        </div>
      )}
    </div>
  )
}
