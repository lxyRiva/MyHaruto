// L2 清单树（任务模块+今天页共用，问题1：今天收进清单树顶部）。RF-P3b 自 App 原样迁出：
// 树渲染（固定入口/H1/H2/未分组/新建清单）+ 纯 UI 态（expandedH1s/h1Menu/subTagMenu/renamingH1/
// subTagModal/dissolveConfirm/addingList 组/l2Drag/l2Over）随迁；
// 路由跳转一律走 App 下发的 nav API（四件套在 App 侧成套同步，Bug2 教训）；解散确认弹窗随本组件
import { useState } from 'react'
import type { SubTag, Tag } from '../../shared/types'
import FloatingMenu from '../../shared/components/FloatingMenu'
import SubTagModal, { PALETTE, H2_PALETTE } from '../../features/tasks/components/SubTagModal'
import { IconSun, IconClock, IconTasks, IconChevron } from '../../shared/components/icons'
import type { PageKey } from '../../App'

export default function L2Sidebar({
  page, activeListId, activeSubTagId,
  specialTags, normalTags, tags, subTags,
  countOf, todayMinutes, todaySessions,
  openToday, openRecent7, openAll, openH1, openH2,
  moveH1, moveSubTag,
  updateTag, addTag, onDissolve,
  addSubTag, updateSubTag, deleteSubTag,
}: {
  page: PageKey
  activeListId: string
  activeSubTagId: string | null
  specialTags: Tag[]
  normalTags: Tag[]
  tags: Tag[]
  subTags: SubTag[]
  countOf: (id: string) => number
  todayMinutes: number
  todaySessions: unknown[]
  openToday: () => void
  openRecent7: () => void
  openAll: () => void
  openH1: (tagId: string) => void
  openH2: (subTagId: string) => void
  moveH1: (dragId: string, targetId: string, pos: 'before' | 'after') => void
  moveSubTag: (dragId: string, targetId: string, pos: 'before' | 'after') => void
  updateTag: (id: string, patch: Partial<Tag>) => void
  addTag: (name: string, color: string) => void
  onDissolve: (tagId: string) => void
  addSubTag: (h1TagId: string, name: string, emoji: string, color: string) => void
  updateSubTag: (id: string, patch: Partial<SubTag>) => void
  deleteSubTag: (id: string) => void
}) {
  // ----- 纯 UI 态（自 App 原样随迁） -----
  const [expandedH1s, setExpandedH1s] = useState<Set<string> | null>(null) // null = 默认全部展开
  const [h1Menu, setH1Menu] = useState<{ tagId: string; x: number; y: number } | null>(null)
  const [subTagMenu, setSubTagMenu] = useState<{ subTagId: string; x: number; y: number } | null>(null)
  const [renamingH1, setRenamingH1] = useState<string | null>(null)
  const [subTagModal, setSubTagModal] = useState<{ mode: 'create' | 'edit'; h1TagId: string; subTag?: SubTag } | null>(null)
  const [dissolveConfirm, setDissolveConfirm] = useState<{ tagId: string } | null>(null)
  // 新建清单表单
  const [addingList, setAddingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState(PALETTE[0])
  // 修正3：L2 的 H1/H2 拖拽排序（置顶项固定最前不参与）
  const [l2Drag, setL2Drag] = useState<{ kind: 'h1' | 'h2'; id: string } | null>(null)
  const [l2Over, setL2Over] = useState<{ kind: 'h1' | 'h2'; id: string; pos: 'before' | 'after' } | null>(null)

  const toggleH1Expand = (tagId: string) =>
    setExpandedH1s((prev) => {
      const cur = prev ?? new Set(tags.map((t) => t.id)) // 首次操作时物化"全展开"
      const next = new Set(cur)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })

  // L2 两层树渲染：H1 行（三角+色点+名称+计数+三点）/ H2 行（缩进22px+emoji+名称）
  const sortedSubTagsOf = (h1TagId: string) =>
    subTags
      .filter((s) => s.h1TagId === h1TagId)
      .sort((a, b) => (a.isPinned === b.isPinned ? a.order - b.order : a.isPinned ? -1 : 1))

  // H2 行（无左内边距：由外层缩进容器统一提供 28px + 竖线）；色点在行最右（修正6：H2 持有颜色标识，H1 不再显示色点）
  const renderSubTagRow = (st: SubTag) => {
    const dragOverH2 = l2Over?.kind === 'h2' && l2Over.id === st.id
    return (
    <button
      key={st.id}
      onDragOver={(e) => {
        if (!l2Drag || l2Drag.kind !== 'h2' || l2Drag.id === st.id || st.isPinned) return
        e.preventDefault()
        const r = e.currentTarget.getBoundingClientRect()
        setL2Over({ kind: 'h2', id: st.id, pos: e.clientY < r.top + r.height / 2 ? 'before' : 'after' })
      }}
      onDrop={(e) => {
        e.preventDefault()
        if (l2Drag && l2Over?.id === st.id) moveSubTag(l2Drag.id, st.id, l2Over.pos)
        setL2Drag(null)
        setL2Over(null)
      }}
      onClick={() => openH2(st.id)}
      onContextMenu={(e) => {
        e.preventDefault()
        setSubTagMenu({ subTagId: st.id, x: e.clientX, y: e.clientY })
      }}
      className={`group/sub w-full flex items-center gap-1.5 pr-2 py-1.5 rounded-lg text-[13px] transition-[border-color]
        ${activeSubTagId === st.id && page === 'tasks'
          ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
          : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}
        ${dragOverH2 ? (l2Over!.pos === 'before' ? 'border-t-2 border-t-haruto-sea' : 'border-b-2 border-b-haruto-sea') : ''}
        ${l2Drag?.kind === 'h2' && l2Drag.id === st.id ? 'opacity-50' : ''}`}
    >
      {/* Bug2 修复：拖拽把手模式——只有把手 draggable，行内 click 不再被拖拽吞掉 */}
      {!st.isPinned && (
        <span
          draggable
          onDragStart={(e) => {
            setL2Drag({ kind: 'h2', id: st.id })
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragEnd={() => {
            setL2Drag(null)
            setL2Over(null)
          }}
          onClick={(e) => e.stopPropagation()}
          title="拖动排序"
          className="cursor-grab shrink-0 w-2 text-center text-neutral-300 opacity-0 group-hover/sub:opacity-100 transition-opacity select-none"
        >
          ⠿
        </span>
      )}
      {st.emoji && <span className="text-xs shrink-0">{st.emoji}</span>}
      <span className="truncate">{st.name}</span>
      <span className="ml-auto mr-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: st.color }} />
    </button>
    )
  }

  // H2 列表容器：缩进 28px（13px 外距 + 15px 内距），浅色竖线分隔视觉层级
  const subTagIndentCls =
    'ml-[13px] pl-[15px] border-l border-neutral-200/70 dark:border-neutral-700/60 space-y-0.5'

  const renderH1 = (t: Tag) => {
    const expanded = expandedH1s === null || expandedH1s.has(t.id)
    const isActive = activeListId === t.id && page === 'tasks' && !activeSubTagId
    const subs = sortedSubTagsOf(t.id)
    return (
      <div key={t.id}>
        {renamingH1 === t.id ? (
          <input
            autoFocus
            defaultValue={t.name}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => setRenamingH1(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                updateTag(t.id, { name: e.currentTarget.value.trim() })
                setRenamingH1(null)
              }
              if (e.key === 'Escape') setRenamingH1(null)
            }}
            className="w-full text-sm rounded-lg border border-haruto-sea
              bg-white dark:bg-neutral-900 px-2 py-1.5 outline-none"
          />
        ) : (
          <div
            onDragOver={(e) => {
              if (!l2Drag || l2Drag.kind !== 'h1' || l2Drag.id === t.id || t.isPinned) return
              e.preventDefault()
              const r = e.currentTarget.getBoundingClientRect()
              setL2Over({ kind: 'h1', id: t.id, pos: e.clientY < r.top + r.height / 2 ? 'before' : 'after' })
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (l2Drag && l2Over?.id === t.id) moveH1(l2Drag.id, t.id, l2Over.pos)
              setL2Drag(null)
              setL2Over(null)
            }}
            onClick={() => {
              toggleH1Expand(t.id)
              openH1(t.id)
            }}
            className={`group/h1 w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer select-none transition-[border-color]
              ${isActive
                ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}
              ${l2Over?.kind === 'h1' && l2Over.id === t.id ? (l2Over.pos === 'before' ? 'border-t-2 border-t-haruto-sea' : 'border-b-2 border-b-haruto-sea') : ''}
              ${l2Drag?.kind === 'h1' && l2Drag.id === t.id ? 'opacity-50' : ''}`}
          >
            {/* Bug2 修复：拖拽把手模式（置顶项无把手） */}
            {!t.isPinned && (
              <span
                draggable
                onDragStart={(e) => {
                  setL2Drag({ kind: 'h1', id: t.id })
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => {
                  setL2Drag(null)
                  setL2Over(null)
                }}
                onClick={(e) => e.stopPropagation()}
                title="拖动排序"
                className="cursor-grab shrink-0 text-neutral-300 opacity-0 group-hover/h1:opacity-100 hover:text-neutral-500 transition-opacity select-none"
              >
                ⠿
              </span>
            )}
            <span className="shrink-0 text-neutral-400"><IconChevron open={expanded} /></span>
            <span className="truncate flex-1">{t.name}</span>
            {/* H2 标签数量（无 H2 时不显示，避免无意义的 0） */}
            {subs.length > 0 && (
              <span className="text-[10px] text-neutral-400 tabular-nums">{subs.length}</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setH1Menu({ tagId: t.id, x: e.clientX, y: e.clientY })
              }}
              title="清单操作"
              className="px-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 leading-none"
            >
              ⋯
            </button>
          </div>
        )}
        {expanded && <div className={subTagIndentCls}>{subs.map(renderSubTagRow)}</div>}
      </div>
    )
  }

  // 置顶的 H1 排前面（组内其余保持原顺序）
  const byPinned = (a: Tag, b: Tag) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
  const ungroupedSubTags = sortedSubTagsOf('')

  return (
    <>
      <aside className="w-52 shrink-0 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-[#fafaf9] dark:bg-[#181818] py-4">
        <div className="px-3 text-xs font-bold text-neutral-400 tracking-widest mb-2">清单</div>
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {/* 固定入口：今天 / 最近7天 / 全部 */}
          <button
            onClick={openToday}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
              ${page === 'today'
                ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <IconSun />
            <span>今天</span>
            <span className="ml-auto text-[10px] text-neutral-400 tabular-nums">{countOf('today')}</span>
          </button>
          <button
            onClick={openRecent7}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
              ${activeListId === 'recent7' && page === 'tasks' && !activeSubTagId
                ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <IconClock />
            <span>最近7天</span>
          </button>
          <button
            onClick={openAll}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
              ${activeListId === 'all' && page === 'tasks' && !activeSubTagId
                ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <IconTasks />
            <span>全部</span>
            <span className="ml-auto text-[10px] text-neutral-400 tabular-nums">{countOf('all')}</span>
          </button>
          {specialTags.length > 0 && (
            <div className="pt-2 pb-0.5 px-3 text-[10px] font-medium text-neutral-400 tracking-wide">我的愿景</div>
          )}
          {[...specialTags].sort(byPinned).map(renderH1)}
          <div className="pt-2 pb-0.5 px-3 text-[10px] font-medium text-neutral-400 tracking-wide">清单</div>
          {[...normalTags].sort(byPinned).map(renderH1)}
          {ungroupedSubTags.length > 0 && (
            <>
              <div className="pt-2 pb-0.5 px-3 text-[10px] font-medium text-neutral-400 tracking-wide">未分组</div>
              <div className={subTagIndentCls}>{ungroupedSubTags.map(renderSubTagRow)}</div>
            </>
          )}
          {addingList ? (
            <div className="px-1 pt-1">
              <input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newListName.trim()) {
                    addTag(newListName.trim(), newListColor)
                    setNewListName(''); setAddingList(false)
                  }
                  if (e.key === 'Escape') setAddingList(false)
                }}
                placeholder="清单名，回车创建"
                className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-600
                  bg-white dark:bg-neutral-900 px-2 py-1.5 outline-none focus:border-haruto-sea"
              />
              <div className="flex gap-1 mt-1.5 px-1">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewListColor(c)}
                    className={`w-3.5 h-3.5 rounded-full ${newListColor === c ? 'ring-2 ring-offset-1 ring-neutral-400' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingList(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 mt-1 rounded-lg text-xs text-neutral-400 hover:text-haruto-sea transition-colors"
            >
              ＋ 新建清单
            </button>
          )}
        </nav>
        <div className="mx-2 mt-2 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2 text-[10px] text-neutral-500">
          今日专注 <b className="text-haruto-sea">{todayMinutes}</b> 分钟 · 🍅{todaySessions.length}
        </div>
      </aside>

      {/* ===== L2 菜单与弹窗（原挂 App 根部，fixed 定位随迁等价） ===== */}
      {h1Menu && (() => {
        const t = tags.find((x) => x.id === h1Menu.tagId)
        if (!t) return null
        return (
          <FloatingMenu
            x={h1Menu.x}
            y={h1Menu.y}
            onClose={() => setH1Menu(null)}
            entries={[
              { label: '重命名', onClick: () => setRenamingH1(t.id) },
              { label: '新建标签', onClick: () => setSubTagModal({ mode: 'create', h1TagId: t.id }) },
              { label: t.isPinned ? '取消置顶' : '置顶', onClick: () => updateTag(t.id, { isPinned: !t.isPinned }) },
              { label: '解散', danger: true, onClick: () => setDissolveConfirm({ tagId: t.id }) },
            ]}
          />
        )
      })()}

      {subTagMenu && (() => {
        const st = subTags.find((x) => x.id === subTagMenu.subTagId)
        if (!st) return null
        return (
          <FloatingMenu
            x={subTagMenu.x}
            y={subTagMenu.y}
            onClose={() => setSubTagMenu(null)}
            entries={[
              { label: '编辑', onClick: () => setSubTagModal({ mode: 'edit', h1TagId: st.h1TagId, subTag: st }) },
              { label: st.isPinned ? '取消置顶' : '置顶', onClick: () => updateSubTag(st.id, { isPinned: !st.isPinned }) },
              { label: st.sharedWithAI ? '取消共享给AI' : '共享给AI', onClick: () => updateSubTag(st.id, { sharedWithAI: !st.sharedWithAI }) },
              { label: '删除', danger: true, onClick: () => deleteSubTag(st.id) },
            ]}
          />
        )
      })()}

      {subTagModal && (
        <SubTagModal
          title={subTagModal.mode === 'edit' ? '编辑标签' : '新建标签'}
          initial={
            subTagModal.mode === 'edit' && subTagModal.subTag
              ? { emoji: subTagModal.subTag.emoji, name: subTagModal.subTag.name, color: subTagModal.subTag.color }
              : { emoji: '', name: '', color: H2_PALETTE[0] }
          }
          onCancel={() => setSubTagModal(null)}
          onSave={(v) => {
            if (subTagModal.mode === 'create') addSubTag(subTagModal.h1TagId, v.name, v.emoji, v.color)
            else if (subTagModal.subTag) updateSubTag(subTagModal.subTag.id, v)
            setSubTagModal(null)
          }}
        />
      )}

      {dissolveConfirm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/30"
          onMouseDown={(e) => e.target === e.currentTarget && setDissolveConfirm(null)}
        >
          <div className="w-72 rounded-xl bg-white dark:bg-neutral-800 shadow-xl border border-neutral-200 dark:border-neutral-700 p-5 animate-[fadeSlideIn_.15s_ease]">
            <div className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">
              解散后该清单下的标签将变为未分组，确定解散？
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDissolveConfirm(null)}
                className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onDissolve(dissolveConfirm.tagId)
                  setDissolveConfirm(null)
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white"
              >
                确认解散
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
