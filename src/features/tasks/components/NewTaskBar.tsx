// 新建任务行（今日/最近7天顶部）：输入框 + 日期图标（日期选择器）+ 小三角（优先级四旗 + H2 标签选择面板）
// 选择 H2 后，任务的 tagId 归属到该 H2 的 h1TagId；sectionId 为 null（列表新建不强制分组）
// RF-Fix3c 第8项：日期/优先级/标签三要素抽为 NewTaskFields 受控字段区组件，
// 供看板列内新建的紧凑变体复用（§10 视图一致性：三要素 UI 单点实现）
import { useRef, useState } from 'react'
import type { SubTag } from '../../../shared/types'
import { IconCalendar, IconChevron } from '../../../shared/components/icons'
import { DatePickerModal } from './DateTimePickers'
import { todayStr } from '../../../shared/utils/date'
import type { Priority } from '../types'

const FLAGS: { v: Priority; color: string; label: string }[] = [
  { v: 'high', color: '#ef4444', label: '高' },
  { v: 'mid', color: '#f59e0b', label: '中' },
  { v: 'low', color: '#3b82f6', label: '低' },
  { v: 'none', color: '#9ca3af', label: '无' },
]

const FlagIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill={color}>
    <path d="M6 3v18" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M6 4h11l-2.5 3.5L17 11H6z" />
  </svg>
)

/* ---------- 字段区（日期 chip + 优先级四旗/标签面板）：受控组件，横板整行与看板紧凑变体共用 ---------- */
export function NewTaskFields({
  subTags,
  dueDate,
  onDueDate,
  priority,
  onPriority,
  subTagId,
  onSubTagId,
  compact = false,
}: {
  subTags: SubTag[]
  dueDate: string | null
  onDueDate: (d: string | null) => void
  priority: Priority
  onPriority: (p: Priority) => void
  subTagId: string | null
  onSubTagId: (id: string | null) => void
  /** 看板列内紧凑变体：按钮收窄 + 面板宽度收窄 */
  compact?: boolean
}) {
  const [dateOpen, setDateOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 })
  const today = todayStr()

  const selSub = subTags.find((s) => s.id === subTagId)

  const openPanel = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const W = compact ? 224 : 256
      setPanelPos({ x: Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8)), y: r.bottom + 6 })
    }
    setPanelOpen((v) => !v)
    setTagOpen(false)
  }

  return (
    <>
      {/* 日期图标：已选则显示日期 chip，未选显示日历图标 */}
      <button
        onClick={() => setDateOpen(true)}
        title={dueDate ? `日期：${dueDate}（点击修改）` : '选择日期'}
        className={`shrink-0 rounded-lg border text-xs transition-colors
          ${compact ? 'px-1.5 py-1' : 'px-2.5 py-2'}
          ${
            dueDate
              ? 'border-haruto-sea/50 bg-haruto-sea/5 text-haruto-sea tabular-nums'
              : 'border-neutral-200 text-neutral-400 hover:border-haruto-sea hover:text-haruto-sea dark:border-neutral-700'
          }`}
      >
        {dueDate ? (dueDate === today ? '今天' : dueDate.slice(5).replace('-', '/')) : (
          <span className={`block ${compact ? '[&>svg]:h-3.5 [&>svg]:w-3.5' : '[&>svg]:h-4 [&>svg]:w-4'}`}>
            <IconCalendar />
          </span>
        )}
      </button>
      {/* 小三角：优先级四旗 + 标签选择面板 */}
      <button
        ref={btnRef}
        onClick={openPanel}
        title="优先级与标签"
        className={`shrink-0 rounded-lg border transition-colors ${compact ? 'px-1 py-1' : 'px-1.5 py-2'} ${
          panelOpen || priority !== 'none' || subTagId
            ? 'border-haruto-sea/50 text-haruto-sea'
            : 'border-neutral-200 text-neutral-400 hover:border-haruto-sea hover:text-haruto-sea dark:border-neutral-700'
        }`}
      >
        <IconChevron open={panelOpen} />
      </button>

      {dateOpen && (
        <DatePickerModal
          initialDueDate={dueDate}
          initialRemindAt={null}
          initialRemindDays={null}
          onSave={(d) => {
            onDueDate(d)
            setDateOpen(false)
          }}
          onCancel={() => setDateOpen(false)}
        />
      )}

      {panelOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPanelOpen(false)} />
          <div
            className={`fixed z-50 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl animate-[fadeSlideIn_.12s_ease] dark:border-neutral-700 dark:bg-neutral-800 ${compact ? 'w-56' : 'w-64'}`}
            style={{ left: panelPos.x, top: panelPos.y }}
          >
            {/* 第一行：优先级四旗 */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-400">优先级</span>
              <div className="flex items-center gap-1.5">
                {FLAGS.map((f) => (
                  <button
                    key={f.v}
                    onClick={() => onPriority(f.v)}
                    title={f.label}
                    className={`grid h-7 w-7 place-items-center rounded-md transition-all ${
                      priority === f.v ? 'bg-black/10 ring-1 ring-neutral-400 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    <FlagIcon color={f.color} />
                  </button>
                ))}
              </div>
            </div>
            {/* 第二行：标签选择（展开 H2 列表，带 emoji 和色点） */}
            <div className="mt-2 border-t border-neutral-100 pt-2 dark:border-neutral-700/60">
              <button
                onClick={() => setTagOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-md px-1 py-1 text-xs text-neutral-600 transition-colors hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
              >
                <span>‹ 标签{selSub ? ` · ${(selSub.emoji ? selSub.emoji + ' ' : '') + selSub.name}` : ''} ›</span>
                <IconChevron open={tagOpen} />
              </button>
              {tagOpen && (
                <div className="mt-1 max-h-40 space-y-0.5 overflow-y-auto">
                  {subTags.length === 0 && <p className="px-1 py-1 text-[10px] text-neutral-300 dark:text-neutral-600">暂无标签</p>}
                  {subTags.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => onSubTagId(subTagId === st.id ? null : st.id)}
                      className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-neutral-600 transition-colors hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
                    >
                      {st.emoji ? <span className="shrink-0 text-[10px]">{st.emoji}</span> : <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: st.color }} />}
                      <span className="min-w-0 flex-1 truncate text-left">{st.name}</span>
                      {subTagId === st.id && <span className="text-[10px] text-neutral-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default function NewTaskBar({
  subTags,
  defaultDueDate,
  onAdd,
}: {
  subTags: SubTag[]
  defaultDueDate: string | null // 回车时未选日期则用它（今日页传今天，最近7天传 null）
  onAdd: (title: string, dueDate: string | null, priority: Priority, tagId: string | null) => void
}) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [priority, setPriority] = useState<Priority>('none')
  const [subTagId, setSubTagId] = useState<string | null>(null)

  const submit = () => {
    const t = title.trim()
    if (!t) return
    const h1TagId = subTagId ? subTags.find((s) => s.id === subTagId)?.h1TagId || null : null
    onAdd(t, dueDate ?? defaultDueDate, priority, h1TagId)
    setTitle('')
    setDueDate(null)
    setPriority('none')
    setSubTagId(null)
  }

  return (
    <div className="relative flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') setTitle('')
        }}
        placeholder="添加任务，回车创建"
        className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm
          outline-none transition-colors focus:border-haruto-sea dark:border-neutral-700 dark:bg-neutral-900"
      />
      <NewTaskFields
        subTags={subTags}
        dueDate={dueDate}
        onDueDate={setDueDate}
        priority={priority}
        onPriority={setPriority}
        subTagId={subTagId}
        onSubTagId={setSubTagId}
      />
    </div>
  )
}
