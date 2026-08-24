// 习惯打卡页：周 / 月 / 年 三视图
// - 周视图：顶部周一~日横向星期栏（今日海蓝高亮+下划线），习惯为行、星期为列的打卡矩阵
//   打卡格统一 w-8 h-8 rounded-full：未打 = 空心浅灰描边圆，已打 = 实心绿(#5b8c5a)+白✓
// - 月视图：像一张表格——最左列竖向 1~31 日期，每个习惯一列（icon + 横排名可换行，名下并排「目标/打卡」两数）
// - 年视图：极简透明边框表格（习惯名 / 已打卡 / 年目标 三列）
//   年目标默认动态计算 = 月目标 ×（创建月~当年12月的月数，含头含尾，如 5 月创建 = 8 个月），
//   灰显；点击数字可写一个"覆盖值"到 localStorage（key=mh-year-target-{habitId}，不动 types.ts），
//   覆盖后显示为海蓝并带 ✕ 可清除恢复联动；已打卡 = 当年 habitRecords 总数
// - 习惯行右键菜单：编辑名称 / 更换图标 / 设置月目标 / 删除（全部行内编辑，Electron 下禁用 prompt）
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import type { Habit, HabitRecord } from '../types'

// 预设 emoji 图标组（新建表单 & 更换图标面板共用）
const PRESET_ICONS = ['💧', '🏃', '📖', '🧘', '✍️', '🎯', '🥗', '😴', '🎧']

// Date → 'YYYY-MM-DD'（本地时区，避免 toISOString 的 UTC 偏移问题）
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 右键菜单形态：root=主菜单 / icon=图标选择面板 / target=月目标输入
interface MenuState {
  habitId: string
  x: number
  y: number
  mode: 'root' | 'icon' | 'target'
}

// 右键菜单里的单个选项按钮
function MenuItem({ children, onClick, danger }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
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

export default function Habits({
  habits,
  habitRecords,
  onAddHabit,
  onUpdateHabit,
  onDeleteHabit,
  onToggleCheck,
}: {
  habits: Habit[]
  habitRecords: HabitRecord[]
  onAddHabit: (name: string, icon: string) => void
  onUpdateHabit: (id: string, patch: Partial<Pick<Habit, 'name' | 'icon' | 'monthlyTarget'>>) => void
  onDeleteHabit: (id: string) => void
  onToggleCheck: (habitId: string, date: string) => void // 幂等切换打卡
}) {
  /* ---------- 视图与新建表单 ---------- */
  const [view, setView] = useState<'week' | 'month' | 'year'>('week')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState(PRESET_ICONS[0])
  const [newTarget, setNewTarget] = useState('20') // 新习惯月目标，默认 20

  /* ---------- 行内编辑状态（名称 / 月目标，月视图表头共用） ---------- */
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null)
  const [targetDraft, setTargetDraft] = useState('')

  /* ---------- 年目标覆盖值（localStorage 持久化，不改动 types.ts） ----------
     key = mh-year-target-{habitId}；未设置 → 显示动态计算值（灰显）；
     设置后 → 显示覆盖值（海蓝，可 ✕ 清除恢复动态联动） */
  const YT_PREFIX = 'mh-year-target-'
  const [yearOverrides, setYearOverrides] = useState<Record<string, number>>({})
  const [editingYearId, setEditingYearId] = useState<string | null>(null) // 年目标行内编辑中的习惯 id
  const [yearDraft, setYearDraft] = useState('')

  // 挂载时扫描 localStorage，读回全部年目标覆盖值
  useEffect(() => {
    try {
      const out: Record<string, number> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k || !k.startsWith(YT_PREFIX)) continue
        const n = Math.floor(Number(localStorage.getItem(k)))
        if (n > 0) out[k.slice(YT_PREFIX.length)] = n
      }
      setYearOverrides(out)
    } catch {
      /* localStorage 不可用时静默降级为动态值 */
    }
  }, [])

  // 写入 / 清除覆盖值（localStorage 与组件状态同步）
  const saveYearOverride = (habitId: string, n: number) => {
    try {
      localStorage.setItem(YT_PREFIX + habitId, String(n))
    } catch {
      /* 忽略写入失败 */
    }
    setYearOverrides((p) => ({ ...p, [habitId]: n }))
  }
  const clearYearOverride = (habitId: string) => {
    try {
      localStorage.removeItem(YT_PREFIX + habitId)
    } catch {
      /* 忽略删除失败 */
    }
    setYearOverrides((p) => {
      const next = { ...p }
      delete next[habitId]
      return next
    })
  }

  /* ---------- 右键菜单 ---------- */
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [customIcon, setCustomIcon] = useState('') // 图标面板的自定义输入
  const [menuTargetDraft, setMenuTargetDraft] = useState('') // 菜单内月目标输入
  const menuRef = useRef<HTMLDivElement | null>(null)

  /* ---------- 新建时自定义月目标的落地 ----------
     onAddHabit 只收 (name, icon)；创建成功后 habits 会多出一个新 id，
     这里对该新习惯补一次 onUpdateHabit，把表单里填的月目标写进去 */
  const pendingTargetRef = useRef<number | null>(null)
  const knownIdsRef = useRef<Set<string> | null>(null)
  useEffect(() => {
    const prev = knownIdsRef.current
    const ids = new Set(habits.map((h) => h.id))
    knownIdsRef.current = ids
    const pending = pendingTargetRef.current
    if (pending == null || prev == null) return
    pendingTargetRef.current = null
    const fresh = habits.find((h) => !prev.has(h.id))
    if (fresh && fresh.monthlyTarget !== pending) onUpdateHabit(fresh.id, { monthlyTarget: pending })
  }, [habits, onUpdateHabit])

  /* ---------- 点击菜单外 / Esc 关闭右键菜单 ---------- */
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

  const now = new Date()
  const todayStr = fmtDate(now)
  const checked = (habitId: string, date: string) =>
    habitRecords.some((r) => r.habitId === habitId && r.date === date)

  // 本周一~周日
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  // 连续打卡天数：从今天往回数（今天没打就从昨天起算）
  const streak = (habitId: string) => {
    let n = 0
    const d = new Date(now)
    if (!checked(habitId, fmtDate(d))) d.setDate(d.getDate() - 1)
    while (checked(habitId, fmtDate(d))) {
      n++
      d.setDate(d.getDate() - 1)
    }
    return n
  }

  // 当月已打数
  const monthCount = (habitId: string) =>
    habitRecords.filter((r) => r.habitId === habitId && r.date.slice(0, 7) === todayStr.slice(0, 7)).length

  // ---- 年视图统计 ----
  // 已打卡：该习惯当年 habitRecords 总数
  const yearCount = (habitId: string) =>
    habitRecords.filter((r) => r.habitId === habitId && r.date.slice(0, 4) === String(now.getFullYear())).length

  // 创建月~当年12月的月数（含头含尾）：去年及更早创建 = 12 个月；今年 5 月创建 = 12-4 = 8 个月
  const yearSpan = (h: Habit) => {
    const c = new Date(h.createdAt)
    if (isNaN(c.getTime())) return 12 // 解析失败按全年算
    if (c.getFullYear() < now.getFullYear()) return 12
    if (c.getFullYear() > now.getFullYear()) return 1
    return 12 - c.getMonth() // getMonth() 从 0 起：5 月 = 4 → 8
  }

  // 年目标动态计算值 = 月目标 × 上述月数
  const calcYearTarget = (h: Habit) => Math.max(1, h.monthlyTarget * yearSpan(h))

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthPrefix = todayStr.slice(0, 8) // 'YYYY-MM-'，用于拼当月日期

  /* ---------- 操作 ---------- */
  // 在习惯行/表头上右键：弹出自定义菜单（阻止浏览器默认菜单）
  const openMenu = (e: ReactMouseEvent, habitId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({
      habitId,
      x: Math.max(8, Math.min(e.clientX, window.innerWidth - 230)), // 防溢出屏幕
      y: Math.max(8, Math.min(e.clientY, window.innerHeight - 250)),
      mode: 'root',
    })
  }

  // 提交名称行内编辑（Enter / 失焦）
  const commitName = () => {
    if (editingNameId && nameDraft.trim()) onUpdateHabit(editingNameId, { name: nameDraft.trim() })
    setEditingNameId(null)
  }
  // 提交月视图表头的月目标行内编辑（Enter / 失焦）
  const commitTarget = () => {
    const n = Math.floor(Number(targetDraft))
    if (editingTargetId && n > 0) onUpdateHabit(editingTargetId, { monthlyTarget: n })
    setEditingTargetId(null)
  }
  // 提交年目标行内编辑（Enter / 失焦）：正整数 = 存覆盖值；空 / 非法 = 清除覆盖恢复动态联动
  const commitYearTarget = () => {
    if (!editingYearId) return
    const n = Math.floor(Number(yearDraft))
    if (yearDraft.trim() !== '' && n > 0) saveYearOverride(editingYearId, n)
    else clearYearOverride(editingYearId)
    setEditingYearId(null)
  }
  // 提交右键菜单里的月目标输入
  const applyMenuTarget = () => {
    if (!menu) return
    const n = Math.floor(Number(menuTargetDraft))
    if (n > 0) onUpdateHabit(menu.habitId, { monthlyTarget: n })
    setMenu(null)
  }
  // 创建新习惯（名称框回车触发）
  const submitNewHabit = () => {
    const name = newName.trim()
    if (!name) return
    onAddHabit(name, newIcon)
    const n = Math.floor(Number(newTarget))
    pendingTargetRef.current = n > 0 ? n : null // 创建后由上面的 effect 补写
    setNewName('')
    setNewTarget('20')
    setNewIcon(PRESET_ICONS[0])
    setAdding(false)
  }

  const menuHabit = menu ? habits.find((h) => h.id === menu.habitId) : undefined
  const canCreate = newName.trim() !== ''

  return (
    <div className="p-6">
      {/* ===== 顶栏：标题 + 新习惯入口 + 周/月切换 ===== */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-xl font-bold shrink-0">习惯打卡</h1>
          <span className="text-[10px] text-neutral-400 truncate">右键习惯可编辑 / 换图标 / 删除</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="text-xs px-3 py-1.5 rounded-full border border-dashed border-neutral-300 dark:border-neutral-600
                text-neutral-400 hover:border-haruto-sea hover:text-haruto-sea transition-colors"
            >
              ＋ 新习惯
            </button>
          )}
          <div className="flex rounded-lg bg-black/5 dark:bg-white/5 p-0.5 text-xs">
            {(['week', 'month', 'year'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md transition-colors
                  ${view === v ? 'bg-haruto-sea text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
              >
                {{ week: '周', month: '月', year: '年' }[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 新习惯行内表单：emoji 选择 + 名称 + 月目标，回车创建 ===== */}
      {adding && (
        <div
          className="task-item mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border
            border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3"
        >
          <div className="flex flex-wrap gap-1">
            {PRESET_ICONS.map((e) => (
              <button
                key={e}
                onClick={() => setNewIcon(e)}
                title={`图标 ${e}`}
                className={`w-8 h-8 rounded-lg text-base grid place-items-center transition-all
                  ${newIcon === e ? 'bg-haruto-sea/15 ring-1 ring-haruto-sea' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitNewHabit()
              if (e.key === 'Escape') setAdding(false)
            }}
            placeholder="习惯名称，回车创建"
            className="flex-1 min-w-40 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700
              bg-transparent px-3 py-2 outline-none focus:border-haruto-sea"
          />
          <label className="flex items-center gap-1.5 text-xs text-neutral-400 select-none">
            月目标
            <input
              type="number"
              min={1}
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitNewHabit()
              }}
              className="w-14 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent
                px-2 py-1.5 text-xs text-center tabular-nums outline-none focus:border-haruto-sea"
            />
            天
          </label>
          <button
            onClick={submitNewHabit}
            className={`text-xs px-4 py-2 rounded-lg font-medium transition-colors
              ${
                canCreate
                  ? 'bg-haruto-sea text-white hover:opacity-90'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
              }`}
          >
            创建
          </button>
          <button
            onClick={() => setAdding(false)}
            className="text-xs px-2 py-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            取消
          </button>
        </div>
      )}

      {habits.length === 0 ? (
        /* ===== 空状态 ===== */
        <div className="mt-4 py-24 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 grid place-items-center">
          <div className="text-center select-none">
            <div className="text-4xl opacity-70">🌱</div>
            <div className="mt-3 text-sm text-neutral-400">还没有习惯</div>
            <div className="mt-1 text-xs text-neutral-300 dark:text-neutral-600">点右上「＋ 新习惯」，从一件小事开始</div>
          </div>
        </div>
      ) : view === 'week' ? (
        /* ===== 周视图：习惯为行 × 星期一~日为列，白底浅色、留白充足 ===== */
        <div className="mt-4 select-none rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
          {/* 星期栏：今天海蓝高亮 + 下划线 */}
          <div className="grid grid-cols-[180px_repeat(7,minmax(0,1fr))] bg-black/[0.03] dark:bg-white/5">
            <div className="px-4 py-3 text-[10px] text-neutral-400">习惯 / 星期</div>
            {weekDays.map((d, i) => {
              const isToday = fmtDate(d) === todayStr
              return (
                <div
                  key={i}
                  className={`py-2 text-center border-b-2 ${isToday ? 'border-haruto-sea' : 'border-transparent'}`}
                >
                  <div className={`text-xs ${isToday ? 'text-haruto-sea font-bold' : 'text-neutral-400'}`}>
                    {'一二三四五六日'[i]}
                  </div>
                  <div
                    className={`mt-0.5 text-[10px] tabular-nums ${
                      isToday ? 'text-haruto-sea font-semibold' : 'text-neutral-400/80'
                    }`}
                  >
                    {d.getMonth() + 1}/{d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
          {/* 习惯行 */}
          {habits.map((h) => (
            <div
              key={h.id}
              onContextMenu={(e) => openMenu(e, h.id)}
              className="grid grid-cols-[180px_repeat(7,minmax(0,1fr))] border-t border-neutral-100 dark:border-neutral-800/60
                items-center hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="px-4 py-2.5 flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">{h.icon}</span>
                {editingNameId === h.id ? (
                  /* 名称行内编辑 */
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitName()
                      if (e.key === 'Escape') setEditingNameId(null)
                    }}
                    className="min-w-0 flex-1 text-xs rounded-md border border-haruto-sea bg-transparent px-2 py-1 outline-none"
                  />
                ) : (
                  <span className="truncate text-sm">{h.name}</span>
                )}
                <span className="shrink-0 text-[10px] text-neutral-400 tabular-nums" title="连续打卡天数">
                  🔥{streak(h.id)}
                </span>
              </div>
              {/* 打卡格：空心描边圆 → 实心绿 + 白✓ */}
              {weekDays.map((d, i) => {
                const ds = fmtDate(d)
                const on = checked(h.id, ds)
                return (
                  <button
                    key={i}
                    onClick={() => onToggleCheck(h.id, ds)}
                    title={`${h.name} · ${ds}`}
                    className={`w-8 h-8 mx-auto rounded-full grid place-items-center text-xs
                      transition-all duration-150 hover:scale-110 active:scale-95
                      ${
                        on
                          ? 'bg-[#5b8c5a] text-white'
                          : 'bg-transparent border border-neutral-300 dark:border-neutral-600 text-transparent hover:border-neutral-400 dark:hover:border-neutral-500'
                      }`}
                  >
                    ✓
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      ) : view === 'month' ? (
        /* ===== 月视图：最左列竖向 1~31 日期 × 每习惯一列（icon+横排名可换行，下并排目标/打卡两数） ===== */
        <div className="mt-4 select-none rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-x-auto">
          <div className="min-w-max">
            {/* 表头行：每个习惯一列 */}
            <div
              className="grid bg-black/[0.03] dark:bg-white/5"
              style={{ gridTemplateColumns: `40px repeat(${habits.length}, minmax(56px, 1fr))` }}
            >
              <div className="py-2 text-[10px] text-neutral-400 text-center">日</div>
              {habits.map((h) => (
                <div
                  key={h.id}
                  onContextMenu={(e) => openMenu(e, h.id)}
                  title="右键可编辑"
                  className="py-2.5 px-1 flex flex-col items-center gap-1"
                >
                  {/* icon + 习惯名：横向排列；名字 min-w-14/max-w-20 允许自动换行，保证各列宽度统一、间距一致 */}
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-base leading-none shrink-0">{h.icon}</span>
                    {editingNameId === h.id ? (
                      /* 名称行内编辑（横向小输入框） */
                      <input
                        autoFocus
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onBlur={commitName}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitName()
                          if (e.key === 'Escape') setEditingNameId(null)
                        }}
                        className="w-16 text-[10px] rounded border border-haruto-sea bg-transparent px-1 py-0.5 text-center outline-none"
                      />
                    ) : (
                      <span className="min-w-14 max-w-20 text-center text-[10px] leading-tight break-words text-neutral-500 dark:text-neutral-400">
                        {h.name}
                      </span>
                    )}
                  </div>
                  {/* 名字下方：「目标N」橙红（点击行内编辑）+「打卡N」茶绿，横向并排、紧凑显示 */}
                  <div className="flex items-center gap-1.5">
                    {editingTargetId === h.id ? (
                      /* 月目标行内小输入框：回车/失焦保存 */
                      <input
                        autoFocus
                        type="number"
                        min={1}
                        value={targetDraft}
                        onChange={(e) => setTargetDraft(e.target.value)}
                        onBlur={commitTarget}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitTarget()
                          if (e.key === 'Escape') setEditingTargetId(null)
                        }}
                        className="w-12 rounded border border-haruto-sea bg-transparent px-1 py-0.5 text-[10px] text-center tabular-nums text-[#e07a5f] outline-none"
                      />
                    ) : (
                      /* 月目标（橙红，点击变行内输入框，编辑逻辑不变） */
                      <button
                        onClick={() => {
                          setEditingTargetId(h.id)
                          setTargetDraft(String(h.monthlyTarget))
                        }}
                        title="点击修改月目标"
                        className="text-[10px] font-bold text-[#e07a5f] tabular-nums hover:underline"
                      >
                        目标{h.monthlyTarget}
                      </button>
                    )}
                    {/* 当月已打数（茶绿） */}
                    <span className="text-[10px] font-bold text-[#6a994e] tabular-nums">打卡{monthCount(h.id)}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* 日期行 1~31：交叉处为打卡小方格 */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const ds = `${monthPrefix}${String(day).padStart(2, '0')}`
              const isToday = ds === todayStr
              return (
                <div
                  key={day}
                  className={`grid border-t border-neutral-100 dark:border-neutral-800/60 ${isToday ? 'bg-haruto-sea/[0.04]' : ''}`}
                  style={{ gridTemplateColumns: `40px repeat(${habits.length}, minmax(56px, 1fr))` }}
                >
                  <div
                    className={`py-0.5 text-[10px] text-center tabular-nums ${
                      isToday ? 'text-haruto-sea font-bold' : 'text-neutral-400'
                    }`}
                  >
                    {day}
                  </div>
                  {habits.map((h) => {
                    const on = checked(h.id, ds)
                    return (
                      <button
                        key={h.id}
                        onClick={() => onToggleCheck(h.id, ds)}
                        title={`${h.name} · ${ds}`}
                        className={`w-7 h-7 rounded-md mx-auto my-1 transition-all duration-150
                          hover:scale-105 active:scale-90
                          ${
                            on
                              ? 'bg-[#5b8c5a]'
                              : 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12]'
                          }`}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ===== 年视图：极简透明边框表格 —— 习惯名 / 已打卡 / 年目标 三列 ===== */
        <div className="mt-4 select-none rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 overflow-hidden">
          {/* 表头 */}
          <div className="grid grid-cols-[1fr_110px_150px] bg-black/[0.02] dark:bg-white/[0.04]">
            <div className="px-4 py-2.5 text-[10px] text-neutral-400">{now.getFullYear()} 年 · 习惯</div>
            <div className="py-2.5 text-center text-[10px] text-neutral-400">已打卡</div>
            <div className="py-2.5 text-center text-[10px] text-neutral-400">年目标</div>
          </div>
          {/* 数据行：右键可呼出习惯菜单；习惯名支持行内改名（与周/月视图共用状态） */}
          {habits.map((h) => {
            const done = yearCount(h.id) // 当年已打卡总数
            const span = yearSpan(h) // 创建月~12月的月数
            const dyn = calcYearTarget(h) // 动态年目标
            const override = yearOverrides[h.id] // 覆盖值（undefined = 未设置）
            const target = override ?? dyn
            return (
              <div
                key={h.id}
                onContextMenu={(e) => openMenu(e, h.id)}
                className="grid grid-cols-[1fr_110px_150px] border-t border-neutral-200/60 dark:border-neutral-700/60
                  items-center hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
              >
                {/* 第一列：图标 + 习惯名（行内改名） */}
                <div className="px-4 py-3 flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{h.icon}</span>
                  {editingNameId === h.id ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={commitName}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitName()
                        if (e.key === 'Escape') setEditingNameId(null)
                      }}
                      className="min-w-0 flex-1 text-xs rounded-md border border-haruto-sea bg-transparent px-2 py-1 outline-none"
                    />
                  ) : (
                    <span className="truncate text-sm">{h.name}</span>
                  )}
                </div>
                {/* 已打卡：达到年目标后变茶绿以示达成 */}
                <div
                  className={`text-center text-sm font-bold tabular-nums select-none
                    ${done >= target ? 'text-[#6a994e]' : 'text-neutral-700 dark:text-neutral-200'}`}
                >
                  {done}
                </div>
                {/* 年目标：未覆盖 = 灰显动态值；已覆盖 = 海蓝 + ✕ 清除；点击数字行内编辑 */}
                <div className="py-2 flex items-center justify-center gap-1.5">
                  {editingYearId === h.id ? (
                    /* 行内编辑：回车保存，Esc 取消；留空回车 = 清除覆盖 */
                    <input
                      autoFocus
                      type="number"
                      min={1}
                      value={yearDraft}
                      onChange={(e) => setYearDraft(e.target.value)}
                      onBlur={commitYearTarget}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitYearTarget()
                        if (e.key === 'Escape') setEditingYearId(null)
                      }}
                      placeholder={String(dyn)}
                      title={`动态计算值：${dyn}`}
                      className="w-16 rounded-md border border-haruto-sea bg-transparent px-1.5 py-1 text-center
                        text-xs tabular-nums outline-none"
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingYearId(h.id)
                          setYearDraft(override != null ? String(override) : '')
                        }}
                        title={
                          override != null
                            ? '覆盖值，点击修改'
                            : `动态计算 = 月目标 ${h.monthlyTarget} × ${span} 个月，点击设置覆盖值`
                        }
                        className={`text-sm font-bold tabular-nums hover:underline select-none
                          ${override != null ? 'text-haruto-sea' : 'text-neutral-400'}`}
                      >
                        {target}
                      </button>
                      {override != null && (
                        /* 清除覆盖值 → 恢复与月目标联动的动态计算 */
                        <button
                          onClick={() => clearYearOverride(h.id)}
                          title="清除覆盖值，恢复动态计算"
                          className="w-4 h-4 rounded-full grid place-items-center text-[9px] text-neutral-400
                            hover:text-red-400 hover:bg-red-400/10 transition-colors select-none"
                        >
                          ✕
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
          {/* 底部说明：解释年目标的动态算法与覆盖机制 */}
          <div className="border-t border-neutral-200/60 dark:border-neutral-700/60 px-4 py-2 text-[10px] text-neutral-400 select-none">
            年目标默认 = 月目标 ×（创建月～12 月的月数，含头尾）→ 灰显；点击数字可覆盖（海蓝，✕ 恢复联动）
          </div>
        </div>
      )}

      {/* ===== 右键菜单浮层（点击别处 / Esc 关闭） ===== */}
      {menu && menuHabit && (
        <div
          ref={menuRef}
          className={`task-item fixed z-50 rounded-xl border border-neutral-200 dark:border-neutral-700
            bg-white dark:bg-neutral-800 shadow-xl py-1.5
            ${menu.mode === 'root' ? 'w-36' : menu.mode === 'icon' ? 'w-52' : 'w-44'}`}
          style={{ left: menu.x, top: menu.y }}
        >
          {menu.mode === 'root' && (
            <>
              <MenuItem
                onClick={() => {
                  setEditingNameId(menuHabit.id)
                  setNameDraft(menuHabit.name)
                  setMenu(null)
                }}
              >
                ✏️ 编辑名称
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setCustomIcon('')
                  setMenu({ ...menu, mode: 'icon' })
                }}
              >
                😀 更换图标
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuTargetDraft(String(menuHabit.monthlyTarget))
                  setMenu({ ...menu, mode: 'target' })
                }}
              >
                🎯 设置月目标
              </MenuItem>
              <div className="my-1 h-px bg-neutral-100 dark:bg-neutral-700/60" />
              <MenuItem
                danger
                onClick={() => {
                  onDeleteHabit(menuHabit.id)
                  setMenu(null)
                }}
              >
                🗑 删除习惯
              </MenuItem>
            </>
          )}

          {/* 图标选择面板：预设 emoji 组 + 自定义输入 */}
          {menu.mode === 'icon' && (
            <div className="p-2">
              <div className="grid grid-cols-5 gap-1">
                {PRESET_ICONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      onUpdateHabit(menuHabit.id, { icon: e })
                      setMenu(null)
                    }}
                    className={`h-8 rounded-lg text-base grid place-items-center transition-colors
                      ${
                        menuHabit.icon === e
                          ? 'bg-haruto-sea/15 ring-1 ring-haruto-sea'
                          : 'hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <input
                autoFocus
                value={customIcon}
                onChange={(e) => setCustomIcon(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customIcon.trim()) {
                    onUpdateHabit(menuHabit.id, { icon: customIcon.trim() })
                    setMenu(null)
                  }
                  if (e.key === 'Escape') setMenu(null)
                }}
                placeholder="输入 emoji，回车应用"
                className="mt-2 w-full rounded-lg border border-neutral-200 dark:border-neutral-600 bg-transparent
                  px-2 py-1.5 text-xs outline-none focus:border-haruto-sea"
              />
            </div>
          )}

          {/* 月目标输入面板 */}
          {menu.mode === 'target' && (
            <div className="p-2.5 flex items-center gap-2">
              <span className="text-xs text-neutral-400 shrink-0 select-none">月目标</span>
              <input
                autoFocus
                type="number"
                min={1}
                value={menuTargetDraft}
                onChange={(e) => setMenuTargetDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyMenuTarget()
                  if (e.key === 'Escape') setMenu(null)
                }}
                className="w-16 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-transparent
                  px-2 py-1.5 text-xs text-center tabular-nums outline-none focus:border-haruto-sea"
              />
              <button
                onClick={applyMenuTarget}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-haruto-sea text-white hover:opacity-90 transition-opacity"
              >
                确定
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
