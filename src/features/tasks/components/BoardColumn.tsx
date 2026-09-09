// 看板 Section 列（RF-P2a 自 BoardView.tsx 原样迁入）：列头操作 + 任务堆叠 + 已完成折叠 + 删除确认
import { useState } from 'react'
import type { Section, SubTag, Tag, Task } from '../../../shared/types'
import { IconChevron } from '../../../shared/components/icons'
import FloatingMenu from '../../../shared/components/FloatingMenu'
import TaskCard from './TaskCard'
import { NewTaskFields } from './NewTaskBar'
import { taskSort, pinnedGroupFirst } from '../utils/taskSort'
import { collapsedOf } from '../utils/taskTree'
import type { CardBundle } from './taskMenu'
import type { Priority } from '../types'
import type { MenuEntry } from '../../../shared/components/FloatingMenu'

/* ---------- Section 列：列头（重命名/＋新建任务/⋯六项菜单）+ 任务堆叠 + 已完成折叠区 + 删除确认 ---------- */
export default function SectionColumn({
  section,
  tasks,
  card,
  renaming,
  onRequestRename,
  onRenameCommit,
  onRenameCancel,
  onAddTaskToSection,
  onInsertSection,
  onMoveSection,
  onDeleteSection,
  onAggregateDone,
}: {
  section: Section
  tasks: Task[] // 本列全部任务（含子任务，父任务嵌套渲染子任务）
  card: CardBundle
  renaming: boolean
  onRequestRename: (id: string) => void
  onRenameCommit: (id: string, name: string) => void
  onRenameCancel: () => void
  onAddTaskToSection: (sectionId: string, title: string, opts?: { dueDate?: string | null; priority?: Priority; tagId?: string | null }) => void
  onInsertSection: (sectionId: string, side: 'left' | 'right') => void
  onMoveSection: (sectionId: string, newSubTagId: string) => void
  onDeleteSection: (sectionId: string) => void
  onAggregateDone: (sectionId: string) => void
}) {
  const [doneOpen, setDoneOpen] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  // Fix3c-2 第8项：看板新建对齐 NewTaskBar——列内紧凑变体的三要素受控态
  const [nfDue, setNfDue] = useState<string | null>(null)
  const [nfPriority, setNfPriority] = useState<Priority>('none')
  const [nfSubTagId, setNfSubTagId] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  /* 分区语义（RF-Fix1 树化；RF-Fix3c 改调 taskTree.collapsedOf 唯一实现）：
     折叠区 = 根任务 aggregated（整树判定）∪ 规则6 散件（显式聚合的 done 子任务）；
     堆叠区 = 其余全部（未完成原位 + 已完成但未聚合的灰显原位）；子任务永远嵌套跟随父卡 */
  const isFolded = collapsedOf(tasks)
  const stack = pinnedGroupFirst(tasks.filter((t) => !isFolded(t)).sort(taskSort)) // 置顶该组排组首（RF-P3）
  const folded = tasks.filter((t) => isFolded(t))
  const stackIds = new Set(stack.map((t) => t.id))
  const foldedIds = new Set(folded.map((t) => t.id))
  const stackRoots = stack.filter((t) => !t.parentTaskId || !stackIds.has(t.parentTaskId))
  const foldedRoots = folded.filter((t) => !t.parentTaskId || !foldedIds.has(t.parentTaskId))

  /* ⋯ 菜单：移动到… 用二级子菜单展示 H1 → H2 树 */
  const byOrder = (a: { isPinned: boolean; order: number }, b: { isPinned: boolean; order: number }) =>
    a.isPinned === b.isPinned ? a.order - b.order : a.isPinned ? -1 : 1
  const byPinned = (a: Tag, b: Tag) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
  const h2Entry = (st: SubTag): MenuEntry => ({
    label: (st.emoji ? `${st.emoji} ` : '') + st.name,
    onClick: () => onMoveSection(section.id, st.id),
  })
  const moveEntries: MenuEntry[] = [...card.tags]
    .sort(byPinned)
    .map((h1) => ({ label: h1.name, submenu: card.subTags.filter((st) => st.h1TagId === h1.id).sort(byOrder).map(h2Entry) }))
  const orphanH2s = card.subTags.filter((st) => st.h1TagId === '').sort(byOrder)
  if (orphanH2s.length) moveEntries.push({ label: '未分组', submenu: orphanH2s.map(h2Entry) })

  const menuEntries: MenuEntry[] = [
    { label: '重命名', onClick: () => onRequestRename(section.id) },
    { label: '在左侧添加分组', onClick: () => onInsertSection(section.id, 'left') },
    { label: '在右侧添加分组', onClick: () => onInsertSection(section.id, 'right') },
    { label: '移动到…', submenu: moveEntries },
    // 数据标记：把组内所有 done 任务标记为已聚合，折叠区随即显示（配合展开）
    { label: '聚合该组下已完成任务', onClick: () => { onAggregateDone(section.id); setDoneOpen(true) } },
    { label: '删除', danger: true, onClick: () => setConfirmDelete(true) },
  ]

  return (
    <div className="flex w-[260px] shrink-0 flex-col">
      <div className="flex items-center gap-1 px-1 pb-2">
        {renaming ? (
          <input
            autoFocus
            defaultValue={section.name}
            onBlur={onRenameCancel}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameCommit(section.id, e.currentTarget.value.trim())
              if (e.key === 'Escape') onRenameCancel()
            }}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded-md border border-haruto-sea bg-transparent px-1.5 py-0.5 text-sm font-bold outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-neutral-700 dark:text-neutral-200">{section.name}</span>
        )}
        <button
          onClick={() => setAddingTask((v) => !v)}
          title="新建任务"
          className={`grid h-6 w-6 place-items-center rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10
            ${addingTask ? 'text-haruto-sea' : 'text-neutral-400 hover:text-haruto-sea'}`}
        >
          ＋
        </button>
        <button
          onClick={(e) => setMenu({ x: e.clientX, y: e.clientY })}
          title="分组操作"
          className="grid h-6 w-6 place-items-center rounded-md text-neutral-400 transition-colors hover:bg-black/5 hover:text-neutral-600 dark:hover:bg-white/10 dark:hover:text-neutral-200"
        >
          ⋯
        </button>
      </div>

      {addingTask && (
        <div className="mb-2 flex items-center gap-1">
          <input
            autoFocus
            placeholder="添加任务…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                const h1TagId = nfSubTagId ? card.subTags.find((s) => s.id === nfSubTagId)?.h1TagId || null : null
                onAddTaskToSection(section.id, e.currentTarget.value.trim(), {
                  dueDate: nfDue,
                  priority: nfPriority,
                  tagId: h1TagId,
                })
                e.currentTarget.value = ''
                setNfDue(null)
                setNfPriority('none')
                setNfSubTagId(null)
                setAddingTask(false)
              }
              if (e.key === 'Escape') {
                setNfDue(null)
                setNfPriority('none')
                setNfSubTagId(null)
                setAddingTask(false)
              }
            }}
            className="min-w-0 flex-1 rounded-lg border border-dashed border-haruto-sea/50 bg-transparent px-2 py-1 text-[13px] outline-none focus:border-haruto-sea"
          />
          {/* 紧凑字段区（NewTaskBar 抽取组件）：日期/优先级/标签三要素与横板对齐 */}
          <NewTaskFields
            compact
            subTags={card.subTags}
            dueDate={nfDue}
            onDueDate={setNfDue}
            priority={nfPriority}
            onPriority={setNfPriority}
            subTagId={nfSubTagId}
            onSubTagId={setNfSubTagId}
          />
        </div>
      )}

      <div className="min-h-[48px] space-y-2">
        {stackRoots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200/80 px-2 py-3 text-center text-xs text-neutral-300 dark:border-neutral-700/60 dark:text-neutral-600">
            暂无任务
          </div>
        ) : (
          stackRoots.map((t) => <TaskCard key={t.id} task={t} columnTasks={tasks} foldedIds={foldedIds} parentFolded={false} depth={0} seen={new Set([t.id])} {...card} />)
        )}
      </div>

      {foldedRoots.length > 0 && (
        <div className="mt-3 border-t border-neutral-200/70 pt-2 dark:border-neutral-700/60">
          <button
            onClick={() => setDoneOpen((v) => !v)}
            className="flex items-center gap-1 rounded px-1 py-0.5 text-xs text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <IconChevron open={doneOpen} />
            已完成 {foldedRoots.length}
          </button>
          {doneOpen && (
            <div className="mt-2 space-y-2">
              {foldedRoots.map((t) => (
                <TaskCard key={t.id} task={t} columnTasks={tasks} foldedIds={foldedIds} parentFolded={true} depth={0} seen={new Set([t.id])} {...card} />
              ))}
            </div>
          )}
        </div>
      )}

      {menu && <FloatingMenu x={menu.x} y={menu.y} entries={menuEntries} onClose={() => setMenu(null)} />}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/30 animate-[fadeSlideIn_.15s_ease]"
          onMouseDown={(e) => e.target === e.currentTarget && setConfirmDelete(false)}
        >
          <div className="w-72 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800">
            <div className="text-sm font-semibold select-none">删除该分组及其下所有任务？</div>
            <div className="mt-1 text-xs text-neutral-400 select-none">
              {section.name} · {tasks.length} 个任务将一并删除
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  onDeleteSection(section.id)
                  setConfirmDelete(false)
                }}
                className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-medium text-white transition-opacity select-none hover:opacity-90"
              >
                确认删除
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg border border-neutral-200 py-2 text-xs text-neutral-500 transition-colors select-none hover:text-neutral-700 dark:border-neutral-600 dark:hover:text-neutral-200"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

