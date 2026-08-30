// 重要日页：左栏重要日（🎂生日/🎉节日/📌自定义）竖版图文卡管理，右栏生理期迷你月历（记录 + 预测）
// 卡片：图上字下（图区 60% PNG 插画 / 文区 40% 标题+日期+倒计时胶囊），网格 2~3 列，
//       白底圆角 xl 柔和阴影，hover 轻微上浮；右键菜单（编辑/重复/日期/置顶/删除，带二级子菜单）、已归档折叠区保留。
// 图样：全部 9 张 PNG 插画（public/assets/days/，birthday/festival/custom 各 3 张，不按类型过滤），
//       全局索引 0-8 存 localStorage（key=mh-day-style-{id}，不污染 note 数据）；
//       旧「按类型 0-2」索引由挂载时的一次性迁移（marker=mh-day-style-v2）换算为全局索引。
// 右键菜单二级子菜单：重复▸（不重复/每年/每月/每周/每天——「每年」= types.ts 的 repeatYearly，
//       每月/每周/每天本轮仅 UI，存 mh-day-repeat-{id}，待 types 扩展字段后接入计算）；
//       日期▸（公历/农历，存 mh-day-lunar-{id}，true=农历，仅影响显示；新建/编辑表单内也可切换）。
// 置顶：存 mh-day-pinned-{id}，置顶卡片排列表最前并带 📌 小标记。
// 农历：标记为农历的卡片显示「农历X月X日」（solarlunar.solar2lunar 的 monthCn/dayCn），
//       新建/编辑表单选日期后实时预览；存储与倒计时计算始终保持公历原值（小字提示「按公历日期提醒」）。
// 生理期：点击日期弹出居中确认弹窗（开始/结束确认），绝不自动测算结束——无 endDate 只标记开始日，不蔓延；
//        预测（浅红虚线）仅作显示建议。注意：经期预测只是日历推算，仅供参考，非医疗建议。
//        栏底部有「AI 的关心」只读入口（M6 定时行为预留，名字读 settings.aiName）。
// 所有编辑均为行内表单（Electron 下禁用 prompt/alert）。
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import type { ImportantDay, PeriodRecord } from '../types'
import solarlunar from 'solarlunar'
import { IconChat, IconChevron } from '../components/icons'
import FloatingMenu from '../components/FloatingMenu'

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

/* ---------- 图样变体表：全部 9 张 PNG 插画（public/assets/days/），不按类型过滤 ---------- */

const PNG_VARIANTS: Record<ImportantDay['type'], { file: string; name: string }[]> = {
  birthday: [
    { file: 'birthday-balloon.png', name: '热气球' },
    { file: 'birthday-cake.png', name: '蛋糕' },
    { file: 'birthday-cat.png', name: '猫咪' },
  ],
  festival: [
    { file: 'festival-lantern.png', name: '灯笼' },
    { file: 'festival-fireworks.png', name: '烟花' },
    { file: 'festival-christmas.png', name: '圣诞' },
  ],
  custom: [
    { file: 'custom-moon.png', name: '月亮' },
    { file: 'custom-plane.png', name: '纸飞机' },
    { file: 'custom-plant.png', name: '绿植' },
  ],
}

// 全局图样表：索引 0-8 依次为 birthday 0-2 / festival 3-5 / custom 6-8（不再按类型过滤）
const PNG_ALL: { file: string; name: string }[] = [
  ...PNG_VARIANTS.birthday,
  ...PNG_VARIANTS.festival,
  ...PNG_VARIANTS.custom,
]

// localStorage key 前缀：mh-day-style-{id} = 图样索引（0..2）
const DS_PREFIX = 'mh-day-style-'
// mh-day-repeat-{id} = 重复扩展标记（monthly / weekly / daily，本轮仅 UI）
const RP_PREFIX = 'mh-day-repeat-'
// mh-day-lunar-{id} = 历法标记（'1' = 农历，仅影响显示）
const LN_PREFIX = 'mh-day-lunar-'
// mh-day-pinned-{id} = 置顶标记（'1' = 置顶，排最前 + 小标记）
const PIN_PREFIX = 'mh-day-pinned-'

/* ---------- 重复模式（右键菜单「重复▸」） ---------- */

// 「每年」映射 types.ts 的 repeatYearly；每月/每周/每天本轮仅 UI（localStorage），待 types 扩展
type RepeatMode = 'none' | 'yearly' | 'monthly' | 'weekly' | 'daily'
const REPEAT_MODES: { value: RepeatMode; label: string }[] = [
  { value: 'none', label: '不重复' },
  { value: 'yearly', label: '每年' },
  { value: 'monthly', label: '每月' },
  { value: 'weekly', label: '每周' },
  { value: 'daily', label: '每天' },
]
// 每月/每周/每天（仅 UI 标记）在卡片上的小标签文案
const REPEAT_LABELS: Record<string, string> = { monthly: '每月', weekly: '每周', daily: '每天' }

/* ---------- 农历显示（solarlunar：公历→农历，仅用于展示；倒计时始终按公历原值计算） ---------- */

// 公历 YYYY-MM-DD → 「农历X月X日」（如 农历八月十五）；非法 / 转换失败返回空串
function lunarText(s: string): string {
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return ''
  const lun = solarlunar.solar2lunar(y, m, d)
  return lun === -1 ? '' : `农历${lun.monthCn}${lun.dayCn}`
}

/* ---------- 卡片图区：PNG 插画（唯一图样体系，全局索引 0-8） ---------- */
// 相对路径 assets/days/xxx.png（Electron 从 dist 加载时相对路径才正确）；object-cover 满铺图区
function DayArtPng({ variant }: { variant: number }) {
  const png = PNG_ALL[variant] ?? PNG_ALL[0] // 索引越界兜底第一张
  return (
    <img
      src={`assets/days/${png.file}`}
      alt={png.name}
      draggable={false}
      className="block w-full h-full object-cover"
    />
  )
}

// 图样选择器：全部 9 张 PNG 缩略图（不按类型过滤，表单共用）
function VariantPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-neutral-500 select-none">图样</span>
      {PNG_ALL.map((p, i) => (
        <button
          key={p.file}
          type="button"
          onClick={() => onChange(i)}
          title={p.name}
          className={`w-16 h-11 rounded-md overflow-hidden border transition-all flex items-center justify-center
            ${
              value === i
                ? 'border-haruto-sea ring-1 ring-haruto-sea'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
            }`}
        >
          <img src={`assets/days/${p.file}`} alt={p.name} draggable={false} className="w-12 h-8 object-cover rounded" />
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

// 重要日 → 农历显示文案：每年重复只存 MM-DD，先用「下一次发生」的年份补全再转农历
function lunarDayText(d: ImportantDay, todayStart: Date): string {
  return lunarText(d.repeatYearly ? fmtDate(nextOccur(d, todayStart)) : d.date)
}

// 右键菜单状态（屏幕坐标，fixed 定位浮层）
interface MenuState {
  id: string
  x: number
  y: number
}

// 二级子菜单状态（repeat=重复频率 / date=历法；屏幕坐标 fixed 定位，DOM 挂在父菜单内以便统一判定「点击外部」）
interface SubMenuState {
  kind: 'repeat' | 'date'
  x: number
  y: number
}

// 开关面板用的 Toggle（美柚式滑动开关）
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
        on ? 'bg-[#d94f6e]' : 'bg-neutral-300 dark:bg-neutral-600'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
          on ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

// 生理期内嵌确认条状态：kind = start(问开始) / end(问结束) / info(仅提示)
interface PopState {
  date: string
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

// 右键菜单里的单个选项按钮（可带：hover 回调 / 右侧 › 箭头（有子菜单）/ 选中态 ✓）
function MenuRow({
  children,
  onClick,
  onHover,
  danger,
  arrow,
  active,
}: {
  children: ReactNode
  onClick?: () => void
  onHover?: (e: ReactMouseEvent<HTMLButtonElement>) => void
  danger?: boolean
  arrow?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs transition-colors
        ${
          danger
            ? 'text-red-500 hover:bg-red-500/10'
            : active
              ? 'text-haruto-sea font-medium hover:bg-black/5 dark:hover:bg-white/10'
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'
        }`}
    >
      <span>{children}</span>
      {arrow && <span className="text-[10px] text-neutral-400 select-none">›</span>}
      {active && <span className="text-[10px] select-none">✓</span>}
    </button>
  )
}

export default function ImportantDays({
  importantDays,
  periodRecords,
  aiName,
  onAddDay,
  onUpdateDay,
  onDeleteDay,
  onPeriodMark,
  onDeletePeriod,
  onPeriodReopen,
}: {
  importantDays: ImportantDay[]
  periodRecords: PeriodRecord[]
  aiName: string // AI 角色显示名（settings.aiName）
  onAddDay: (d: Omit<ImportantDay, 'id'>) => void
  onUpdateDay: (id: string, patch: Partial<ImportantDay>) => void
  onDeleteDay: (id: string) => void
  onPeriodMark: (date: string, kind: 'start' | 'end') => void // 标记经期开始/结束
  onDeletePeriod: (startDate: string) => void // 删除一条经期记录（右键取消/删除用）
  onPeriodReopen: (startDate: string) => void // 恢复一条已结束记录为进行中（endDate 置 null）
}) {
  /* ---------- 左栏：添加表单状态 ---------- */
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ImportantDay['type']>('custom')
  const [date, setDate] = useState('')
  const [repeatYearly, setRepeatYearly] = useState(false)
  const [remindDays, setRemindDays] = useState(7) // 提前提醒天数，默认 7
  const [newStyle, setNewStyle] = useState(0) // 新建时选的图样索引（全局 0..8），默认 0
  const [newLunar, setNewLunar] = useState(false) // 新建时选的历法（false=公历，true=农历仅影响显示）

  /* ---------- 左栏：右键菜单（含二级子菜单）/ 行内编辑 / 归档折叠 ---------- */
  const [menu, setMenu] = useState<MenuState | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [sub, setSub] = useState<SubMenuState | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EditDraft | null>(null)
  const [editStyle, setEditStyle] = useState(0) // 编辑表单里的图样索引（localStorage）
  const [archivedOpen, setArchivedOpen] = useState(false)

  /* ---------- 图样 / 重复 / 历法 / 置顶标记（localStorage 持久化，不污染 note 数据） ---------- */
  const [styleMap, setStyleMap] = useState<Record<string, number>>({})
  const [repeatMap, setRepeatMap] = useState<Record<string, string>>({}) // monthly / weekly / daily
  const [lunarMap, setLunarMap] = useState<Record<string, boolean>>({}) // true = 农历
  const [pinnedMap, setPinnedMap] = useState<Record<string, boolean>>({}) // true = 置顶
  // 挂载时读回全部标记（图样索引同时做「mod 3 归入 PNG」的一次性归一化）
  useEffect(() => {
    try {
      // 先收集所有相关 key 再处理（避免边遍历边删改导致索引位移）
      const styleKeys: string[] = []
      const repeats: Record<string, string> = {}
      const lunars: Record<string, boolean> = {}
      const pins: Record<string, boolean> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k) continue
        if (k.startsWith(DS_PREFIX)) styleKeys.push(k)
        else if (k.startsWith(RP_PREFIX)) {
          const v = localStorage.getItem(k)
          if (v === 'monthly' || v === 'weekly' || v === 'daily') repeats[k.slice(RP_PREFIX.length)] = v
        } else if (k.startsWith(LN_PREFIX) && localStorage.getItem(k) === '1') {
          lunars[k.slice(LN_PREFIX.length)] = true
        } else if (k.startsWith(PIN_PREFIX) && localStorage.getItem(k) === '1') {
          pins[k.slice(PIN_PREFIX.length)] = true
        }
      }
      // —— 图样索引迁移 v2：图样从「按类型 3 张」扩为「全局 9 张」——
      // 旧语义 0..2（按卡片类型选 PNG）→ 新语义全局 0..8；一次性迁移，marker 防重复执行
      const typeOf = new Map(importantDays.map((d) => [d.id, d.type]))
      const MIG_KEY = 'mh-day-style-v2'
      const migrated = localStorage.getItem(MIG_KEY) === '1'
      const out: Record<string, number> = {}
      for (const k of styleKeys) {
        const id = k.slice(DS_PREFIX.length)
        let n = Number(localStorage.getItem(k))
        if (!Number.isFinite(n) || n < 0) n = 0
        if (!migrated) {
          const off = typeOf.get(id) === 'festival' ? 3 : typeOf.get(id) === 'custom' ? 6 : 0
          n = off + (n % 3)
          localStorage.setItem(k, String(n))
        }
        if (n > 0) {
          out[id] = n
        } else {
          localStorage.removeItem(k) // 0 = 默认图样，清掉 key 保持整洁
        }
      }
      if (!migrated) {
        try {
          localStorage.setItem(MIG_KEY, '1')
        } catch {
          /* 忽略写入失败 */
        }
      }
      setStyleMap(out)
      setRepeatMap(repeats)
      setLunarMap(lunars)
      setPinnedMap(pins)
    } catch {
      /* localStorage 不可用时静默降级为默认 */
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
  // 写入 / 清除重复扩展标记（每月/每周/每天，本轮仅 UI）
  const setRepeatMode = (id: string, mode: string | null) => {
    try {
      if (mode) localStorage.setItem(RP_PREFIX + id, mode)
      else localStorage.removeItem(RP_PREFIX + id)
    } catch {
      /* 忽略写入失败 */
    }
    setRepeatMap((p) => {
      const next = { ...p }
      if (mode) next[id] = mode
      else delete next[id]
      return next
    })
  }
  // 写入 / 清除历法标记（true = 农历；仅影响显示，不改存储的公历日期）
  const setLunarFlag = (id: string, v: boolean) => {
    try {
      if (v) localStorage.setItem(LN_PREFIX + id, '1')
      else localStorage.removeItem(LN_PREFIX + id)
    } catch {
      /* 忽略写入失败 */
    }
    setLunarMap((p) => {
      const next = { ...p }
      if (v) next[id] = true
      else delete next[id]
      return next
    })
  }
  // 写入 / 清除置顶标记（true = 置顶：列表最前 + 卡片小标记）
  const setPinnedFlag = (id: string, v: boolean) => {
    try {
      if (v) localStorage.setItem(PIN_PREFIX + id, '1')
      else localStorage.removeItem(PIN_PREFIX + id)
    } catch {
      /* 忽略写入失败 */
    }
    setPinnedMap((p) => {
      const next = { ...p }
      if (v) next[id] = true
      else delete next[id]
      return next
    })
  }

  /* ---------- 新建重要日后落地图样/历法（onAddDay 不返回 id，靠新增 id 检测） ---------- */
  const pendingStyleRef = useRef<number | null>(null)
  const pendingLunarRef = useRef(false)
  const knownDayIdsRef = useRef<Set<string> | null>(null)
  useEffect(() => {
    const prev = knownDayIdsRef.current
    const ids = new Set(importantDays.map((d) => d.id))
    knownDayIdsRef.current = ids
    const pending = pendingStyleRef.current
    if (pending == null || prev == null) return
    pendingStyleRef.current = null
    const fresh = importantDays.find((d) => !prev.has(d.id))
    if (fresh) {
      if (pending > 0) setDayStyle(fresh.id, pending)
      if (pendingLunarRef.current) setLunarFlag(fresh.id, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importantDays])

  /* ---------- 右栏：月历视图状态 / 生理期小气泡 / AI 关心入口 ---------- */
  const [view, setView] = useState(() => {
    const n = new Date()
    return { y: n.getFullYear(), m: n.getMonth() }
  })
  const [pop, setPop] = useState<PopState | null>(null) // 月历下方内嵌确认条（start/end/info）
  const [aiCareOpen, setAiCareOpen] = useState(false) // 「AI 的关心」展开态（M6 预留，当前只读占位）

  const now = new Date()
  const todayStr = fmtDate(now)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  /* ---------- 左栏：列表（已归档不进主列表；置顶最前，其余按下次发生临近排序） ---------- */
  const activeDays = importantDays.filter((d) => !d.archived)
  const archivedDays = importantDays.filter((d) => d.archived)
  const sortedDays = [...activeDays].sort((a, b) => {
    const pa = pinnedMap[a.id] ? 0 : 1
    const pb = pinnedMap[b.id] ? 0 : 1
    if (pa !== pb) return pa - pb // 置顶排最前
    return nextOccur(a, todayStart).getTime() - nextOccur(b, todayStart).getTime()
  })

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
    pendingLunarRef.current = newLunar // 历法标记一并落地
    // 保存后重置并收起表单
    setTitle('')
    setDate('')
    setType('custom')
    setRepeatYearly(false)
    setRemindDays(7)
    setNewStyle(0)
    setNewLunar(false)
    setAdding(false)
  }

  /* ---------- 右键菜单：打开 / 关闭 ---------- */
  const openMenu = (e: ReactMouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setPop(null) // 菜单与气泡互斥
    setSub(null) // 打开新菜单时收起旧子菜单
    setMenu({
      id,
      x: Math.max(8, Math.min(e.clientX, window.innerWidth - 170)), // 防溢出屏幕
      y: Math.max(8, Math.min(e.clientY, window.innerHeight - 200)),
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

  // 二级子菜单：hover 父项时锚定其右侧展开同样式浮层（右侧放不下翻左侧；上下防溢出）
  const openSubMenu = (e: ReactMouseEvent<HTMLButtonElement>, kind: 'repeat' | 'date') => {
    const r = e.currentTarget.getBoundingClientRect()
    const W = 96 // 子菜单宽（w-24）
    const H = kind === 'repeat' ? 170 : 84 // 预估高度（5 项 / 2 项）
    let x = r.right + 6
    if (x + W > window.innerWidth - 8) x = Math.max(8, r.left - W - 6) // 右侧放不下 → 翻到左侧
    const y = Math.max(8, Math.min(r.top - 6, window.innerHeight - H - 8))
    setSub({ kind, x, y })
  }

  // 当前重复模式：「每年」看 repeatYearly，其余读扩展标记
  const repeatModeOf = (d: ImportantDay): RepeatMode =>
    d.repeatYearly ? 'yearly' : ((repeatMap[d.id] as RepeatMode) || 'none')

  // 应用重复模式：「每年」= types.ts 的 repeatYearly（true 存 MM-DD / false 补全为完整日期）；
  // 每月/每周/每天本轮仅 UI 标记（localStorage），待 types.ts 扩展字段后再接入计算
  const applyRepeat = (d: ImportantDay, mode: RepeatMode) => {
    const wantYearly = mode === 'yearly'
    if (wantYearly !== d.repeatYearly) {
      onUpdateDay(
        d.id,
        wantYearly
          ? { repeatYearly: true, date: d.date.slice(5) } // 每年重复按约定只存 MM-DD
          : { repeatYearly: false, date: fmtDate(nextOccur(d, todayStart)) } // 关闭时用「下一次发生」补全年份，避免只剩 MM-DD 无法解析
      )
    }
    setRepeatMode(d.id, mode === 'monthly' || mode === 'weekly' || mode === 'daily' ? mode : null)
    setMenu(null)
  }

  // 历法切换：只改显示标记，存储与倒计时仍按公历原值
  const applyCalendar = (d: ImportantDay, lunar: boolean) => {
    setLunarFlag(d.id, lunar)
    setMenu(null)
  }

  // 置顶开关：置顶卡片排最前 + 📌 小标记
  const togglePinned = (d: ImportantDay) => {
    setPinnedFlag(d.id, !pinnedMap[d.id])
    setMenu(null)
  }

  // Esc 关闭内嵌确认条（等同取消，不改动任何记录）
  useEffect(() => {
    if (!pop) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPop(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
    setEditStyle(styleMap[d.id] ?? 0) // 图样索引一并回填（0..2）
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

  /* ---------- 生理期右键：取消记录 / 恢复进行中 / 删除记录 ---------- */
  // 开始日 → 可取消该条记录；结束日 → 最新一条可恢复为进行中，更早的只能删除
  const recByStart = new Map(periodRecords.map((r) => [r.startDate, r]))
  const recByEnd = new Map(periodRecords.filter((r) => r.endDate).map((r) => [r.endDate!, r]))
  const latestRecStart = byStart.length ? byStart[byStart.length - 1].startDate : null
  type PeriodMenuKind = 'cancel-start' | 'reopen' | 'delete-ended'
  const [periodMenu, setPeriodMenu] = useState<{ kind: PeriodMenuKind; startDate: string; x: number; y: number } | null>(null)
  const [periodConfirm, setPeriodConfirm] = useState<{ kind: PeriodMenuKind; startDate: string } | null>(null)

  const handleCellContext = (e: ReactMouseEvent<HTMLButtonElement>, s: string) => {
    e.preventDefault()
    if (recByStart.has(s)) {
      setPeriodMenu({ kind: 'cancel-start', startDate: s, x: e.clientX, y: e.clientY })
      return
    }
    const endRec = recByEnd.get(s)
    if (endRec) {
      // 仅最新一条可恢复为进行中（更早的恢复会造成两条进行中记录）
      const kind: PeriodMenuKind = endRec.startDate === latestRecStart ? 'reopen' : 'delete-ended'
      setPeriodMenu({ kind, startDate: endRec.startDate, x: e.clientX, y: e.clientY })
    }
  }

  /* ---------- 点击日期 → 月历下方内嵌确认条 ---------- */
  // 有未结束记录：点其后日期 = 问「结束」；点开始日本身 / 更早日期 = 提示
  // 无未结束记录：点已记录日期 = 提示；点未记录日期 = 问「开始」
  const handleCellClick = (s: string) => {
    if (openRecord) {
      if (s > openRecord.startDate) {
        setPop({ date: s, kind: 'end' }) // 另点一个日期 → 问结束
        return
      }
      if (s === openRecord.startDate) {
        setPop({ date: s, kind: 'info', info: '该日已记录为经期开始，等待记录结束' })
        return
      }
      setPop({ date: s, kind: 'info', info: `已有开始于 ${openRecord.startDate} 的未结束记录` })
      return
    }
    if (isRecorded(s)) {
      setPop({ date: s, kind: 'info', info: '该日期已在经期记录内' })
      return
    }
    setPop({ date: s, kind: 'start' }) // 常规：问开始
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
          <span className="text-[10px] text-neutral-400">右键卡片：编辑 / 重复 / 日期 / 置顶 / 删除</span>
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
            {/* 历法为农历：日期选择后实时预览对应农历文字（存储与倒计时仍按公历原值） */}
            {newLunar && lunarText(date) && (
              <div className="mt-1 text-[10px] text-neutral-400 select-none">
                对应：{lunarText(date)} · 按公历日期提醒
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* 类型选择 */}
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
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
              {/* 历法切换：公历 / 农历（创建后写入标记，仅影响显示） */}
              <span className="text-xs text-neutral-500 select-none">历法</span>
              {(
                [
                  ['solar', '公历'],
                  ['lunar', '农历'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setNewLunar(v === 'lunar')}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                    ${
                      newLunar === (v === 'lunar')
                        ? 'border-haruto-sea bg-haruto-sea/10 text-haruto-sea font-medium'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400'
                    }`}
                >
                  {label}
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
            {/* 图样选择（9 张 PNG 全量） + 历法选择（公历/农历） */}
            <div className="mt-2.5">
              <VariantPicker value={newStyle} onChange={setNewStyle} />
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

        {/* 原地编辑表单（回填现有值 + 图样选择 + 历法切换；保存在 onUpdateDay，图样/历法入 localStorage） */}
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
            {/* 历法为农历：日期选择后实时预览对应农历文字（存储与倒计时仍按公历原值） */}
            {lunarMap[editingId] && lunarText(draft.date) && (
              <div className="mt-1 text-[10px] text-neutral-400 select-none">
                对应：{lunarText(draft.date)} · 按公历日期提醒
              </div>
            )}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setDraft({ ...draft, type: t.value })}
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
              {/* 历法切换：公历 / 农历（与右键菜单「日期▸」共用同一存储，仅影响显示） */}
              <span className="text-xs text-neutral-500 select-none">历法</span>
              {(
                [
                  ['solar', '公历'],
                  ['lunar', '农历'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setLunarFlag(editingId, v === 'lunar')}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                    ${
                      !!lunarMap[editingId] === (v === 'lunar')
                        ? 'border-haruto-sea bg-haruto-sea/10 text-haruto-sea font-medium'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400'
                    }`}
                >
                  {label}
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
              <VariantPicker value={editStyle} onChange={setEditStyle} />
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
              const styleIdx = styleMap[d.id] ?? 0 // 图样索引（0..2，加载时已归一化）
              const repExtra = repeatMap[d.id] // monthly / weekly / daily（仅 UI 标记）
              // 农历标记：日期行显示「农历X月X日」（转换失败回退公历显示）
              const lunarStr = lunarMap[d.id] ? lunarDayText(d, todayStart) : ''
              return (
                <div
                  key={d.id}
                  onContextMenu={(e) => openMenu(e, d.id)}
                  title="右键：编辑 / 重复 / 日期 / 置顶 / 删除"
                  className="task-item group relative h-[225px] rounded-xl overflow-hidden cursor-default
                    border border-neutral-200/70 dark:border-neutral-700/60 bg-white dark:bg-neutral-900
                    shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* 图区（上 60%）：PNG 插画 <img> 满铺 */}
                  <div className="h-[60%] overflow-hidden">
                    <DayArtPng variant={styleIdx} />
                  </div>
                  {/* 文区（下 40%）：标题（14px 粗体）→ 日期（12px 灰）→ 倒计时胶囊 */}
                  <div className="h-[40%] px-3 pt-2 pb-2.5 flex flex-col min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      {/* 置顶小标记 */}
                      {pinnedMap[d.id] && (
                        <span className="shrink-0 text-[10px]" title="已置顶">
                          📌
                        </span>
                      )}
                      <span className="text-sm font-bold truncate">{d.title}</span>
                      {d.repeatYearly && (
                        <span className="shrink-0 text-[10px]" title="每年重复">
                          🔁
                        </span>
                      )}
                      {/* 每月/每周/每天（本轮仅 UI）：文字小标签 */}
                      {repExtra && (
                        <span
                          className="shrink-0 text-[10px] text-neutral-400 select-none"
                          title={`重复：${REPEAT_LABELS[repExtra]}`}
                        >
                          {REPEAT_LABELS[repExtra]}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-400 tabular-nums select-none">
                      {lunarStr || (d.repeatYearly ? `每年 ${mo}月${dy}日` : d.date)}
                    </div>
                    {/* 农历标记的提示小字：倒计时按公历原值计算 */}
                    {lunarStr && (
                      <div className="text-[10px] text-neutral-400/80 select-none">按公历日期提醒</div>
                    )}
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
                  const styleIdx = styleMap[d.id] ?? 0 // 图样索引（0..2，加载时已归一化）
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-dashed
                        border-neutral-200 dark:border-neutral-700 bg-black/[0.02] dark:bg-white/[0.02]"
                    >
                      {/* 小图样缩略图（PNG 插画） */}
                      <span className="w-12 h-9 shrink-0 rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-700">
                        <DayArtPng variant={styleIdx} />
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
                onClick={() => handleCellClick(s)}
                onContextMenu={(e) => handleCellContext(e, s)}
                title={
                  st === 'open'
                    ? '该日已记录经期开始（右键可取消）'
                    : st === 'recorded'
                      ? '已记录（右键管理）'
                      : st === 'predicted'
                        ? '预测（仅供参考）'
                        : '点击记录开始/结束'
                }
                className={`h-9 rounded-lg flex items-center justify-center text-xs tabular-nums
                  transition-transform duration-200 hover:scale-105
                  ${
                    st === 'open'
                      ? 'bg-[#e88888] text-neutral-800'
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

        {/* 底部图例：进行中 / 已记录 / 预测 + 操作提示 */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-neutral-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[4px] bg-[#e88888]" />
            进行中
          </span>
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

        {/* ===== 生理期内嵌确认条（点日期出现在这里：开始/结束确认或提示，替代原居中弹窗） ===== */}
        {pop && (
          <div className="mt-3 rounded-xl border border-haruto-sea/30 bg-haruto-sea/[0.04] dark:bg-haruto-sea/[0.08] p-3 animate-[fadeSlideIn_.15s_ease]">
            <div className="text-xs font-semibold select-none">
              {pop.kind === 'start' ? '月经开始了吗？' : pop.kind === 'end' ? '月经结束了吗？' : '提示'}
              <span className="ml-2 font-normal text-neutral-400 tabular-nums">{pop.kind === 'info' ? '' : pop.date}</span>
            </div>
            {pop.kind === 'info' && (
              <div className="mt-0.5 text-[11px] text-neutral-400 select-none">{pop.info}</div>
            )}
            <div className="mt-2.5 flex items-center gap-2">
              {pop.kind !== 'info' && (
                <button
                  onClick={() => {
                    onPeriodMark(pop.date, pop.kind === 'end' ? 'end' : 'start')
                    setPop(null)
                  }}
                  className="text-xs px-4 py-1.5 rounded-lg bg-[#d94f6e] text-white font-medium
                    hover:opacity-90 transition-opacity select-none"
                >
                  {pop.kind === 'start' ? '开始' : '结束'}
                </button>
              )}
              <button
                onClick={() => setPop(null)}
                className="text-xs px-3 py-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200
                  transition-colors select-none"
              >
                {pop.kind === 'info' ? '知道啦' : '取消'}
              </button>
            </div>
          </div>
        )}

        {/* ===== AI 的关心（M6 定时行为预留：经期提醒/关怀留言将出现在这里；M5 先做只读占位） ===== */}
        <div className="mt-3 rounded-xl border border-haruto-sea/25 overflow-hidden">
          <button
            type="button"
            onClick={() => setAiCareOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-haruto-sea/5 transition-colors select-none"
          >
            <span className="text-haruto-sea shrink-0"><IconChat /></span>
            <span className="flex-1 text-xs font-medium text-haruto-sea">{aiName} 的关心</span>
            <span className="text-neutral-400 shrink-0"><IconChevron open={aiCareOpen} /></span>
          </button>
          {aiCareOpen && (
            <div className="px-3 pb-3 pt-1 border-t border-haruto-sea/15">
              {/* 只读留言区：M6 上线后 AI 的经期关怀留言写在这里；当前为空时显示提示 */}
              <div className="text-xs italic text-haruto-sea/60 leading-relaxed">
                他还没有留言
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ===== 生理期右键菜单：取消/恢复/删除（仅已标记日期有菜单） ===== */}
      {periodMenu && (
        <FloatingMenu
          x={periodMenu.x}
          y={periodMenu.y}
          onClose={() => setPeriodMenu(null)}
          entries={[
            {
              label:
                periodMenu.kind === 'cancel-start'
                  ? '取消这次经期记录…'
                  : periodMenu.kind === 'reopen'
                    ? '恢复为进行中…'
                    : '删除该条记录…',
              danger: periodMenu.kind !== 'reopen',
              onClick: () => {
                setPeriodConfirm({ kind: periodMenu.kind, startDate: periodMenu.startDate })
                setPeriodMenu(null)
              },
            },
          ]}
        />
      )}

      {/* ===== 生理期操作确认（居中 modal，Electron 禁 confirm） ===== */}
      {periodConfirm && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/30 animate-[fadeSlideIn_.15s_ease]"
          onMouseDown={(e) => e.target === e.currentTarget && setPeriodConfirm(null)}
        >
          <div className="w-72 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-2xl p-5">
            <div className="text-sm font-semibold select-none">
              {periodConfirm.kind === 'cancel-start'
                ? '取消这次经期记录？'
                : periodConfirm.kind === 'reopen'
                  ? '恢复为进行中？'
                  : '该记录已结束，是否删除？'}
            </div>
            <div className="mt-1 text-xs text-neutral-400 tabular-nums select-none">
              开始日 {periodConfirm.startDate}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  if (periodConfirm.kind === 'reopen') onPeriodReopen(periodConfirm.startDate)
                  else onDeletePeriod(periodConfirm.startDate)
                  setPeriodConfirm(null)
                }}
                className={`flex-1 text-xs py-2 rounded-lg font-medium transition-opacity select-none hover:opacity-90 ${
                  periodConfirm.kind === 'reopen' ? 'bg-haruto-sea text-white' : 'bg-[#d94f6e] text-white'
                }`}
              >
                {periodConfirm.kind === 'cancel-start' ? '确认取消' : periodConfirm.kind === 'reopen' ? '确认恢复' : '确认删除'}
              </button>
              <button
                onClick={() => setPeriodConfirm(null)}
                className="flex-1 text-xs py-2 rounded-lg border border-neutral-200 dark:border-neutral-600
                  text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors select-none"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 右键菜单浮层：编辑 / 重复▸ / 日期▸ / 置顶 / 删除（点击别处 / Esc 关闭） ===== */}
      {menu && menuDay && (
        <div
          ref={menuRef}
          className="task-item fixed z-50 w-36 rounded-xl border border-neutral-200 dark:border-neutral-700
            bg-white dark:bg-neutral-800 shadow-xl py-1.5"
          style={{ left: menu.x, top: menu.y }}
        >
          <MenuRow onClick={() => startEdit(menuDay)} onHover={() => setSub(null)}>
            ✏️ 编辑
          </MenuRow>
          {/* 重复▸：hover 右侧展开子菜单（不重复/每年/每月/每周/每天） */}
          <MenuRow arrow onHover={(e) => openSubMenu(e, 'repeat')}>
            🔁 重复
          </MenuRow>
          {/* 日期▸：hover 右侧展开子菜单（公历/农历，仅影响显示） */}
          <MenuRow arrow onHover={(e) => openSubMenu(e, 'date')}>
            📅 日期
          </MenuRow>
          <MenuRow onClick={() => togglePinned(menuDay)} onHover={() => setSub(null)}>
            📌 {pinnedMap[menuDay.id] ? '取消置顶' : '置顶'}
          </MenuRow>
          <div className="my-1 h-px bg-neutral-100 dark:bg-neutral-700/60" />
          <MenuRow
            danger
            onClick={() => {
              onDeleteDay(menuDay.id)
              setMenu(null)
            }}
            onHover={() => setSub(null)}
          >
            🗑 删除
          </MenuRow>

          {/* 二级子菜单：同样式浮层，锚定父项右侧展开（fixed 定位但 DOM 挂在父菜单内，统一判定「点击外部」） */}
          {sub && (
            <div
              className="task-item fixed z-50 w-24 rounded-xl border border-neutral-200 dark:border-neutral-700
                bg-white dark:bg-neutral-800 shadow-xl py-1.5"
              style={{ left: sub.x, top: sub.y }}
              onMouseLeave={() => setSub(null)}
            >
              {sub.kind === 'repeat'
                ? REPEAT_MODES.map((m) => (
                    <MenuRow
                      key={m.value}
                      active={repeatModeOf(menuDay) === m.value}
                      onClick={() => applyRepeat(menuDay, m.value)}
                    >
                      {m.label}
                    </MenuRow>
                  ))
                : (
                    [
                      ['solar', '公历'],
                      ['lunar', '农历'],
                    ] as const
                  ).map(([v, label]) => (
                    <MenuRow
                      key={v}
                      active={!!lunarMap[menuDay.id] === (v === 'lunar')}
                      onClick={() => applyCalendar(menuDay, v === 'lunar')}
                    >
                      {label}
                    </MenuRow>
                  ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
