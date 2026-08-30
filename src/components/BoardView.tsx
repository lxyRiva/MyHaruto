// 看板视图（四层结构 Step 3 + Step 4 分组操作）：
// 视图A = H1 总览：该 H1 下所有 H2 平铺横滚，H2 之间浅色竖线分隔，H2 内 Section 横向排列；
// 视图B = H2 单标签：只渲染该 H2 的 Section 横排，顶部 H2 名称（emoji+色点）。
// 通用：Section 列宽 260px、列距 12px、列头（组名/重命名 + ＋新建任务/⋯六项菜单）、
//       已完成折叠区（done 任务归入折叠区，聚合菜单项只负责展开）、未分组任务兜底区。
// 任务卡片：标题 + 日期（今天紫色）/专注分钟/AI留言气泡；左键详情与右键菜单为 Step 5 占位。
import { useMemo, useState } from 'react'
import type { SubTag, Section, Task, FocusSession, Tag } from '../types'
import { IconChat, IconChevron, IconClock } from './icons'
import FloatingMenu, { type MenuEntry } from './FloatingMenu'

/* ---------- 排序铁律：未完成在前、完成在后；组内 dueDate 升序（无日期排后，无日期里新任务最上） ---------- */
export function sortTasksForSection(tasks: Task[]): Task[] {
  const byDate = (a: Task, b: Task) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate) || a.createdAt.localeCompare(b.createdAt)
    if (!a.dueDate && !b.dueDate) return b.createdAt.localeCompare(a.createdAt) // 新任务在最上面
    return a.dueDate ? -1 : 1
  }
  return [...tasks.filter((t) => !t.done)].sort(byDate).concat([...tasks.filter((t) => t.done)].sort(byDate))
}

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ---------- 任务卡片：标题 + 小字行（日期 / 专注分钟 / AI留言气泡） ---------- */
function TaskCard({ task, minutes }: { task: Task; minutes: number }) {
  const today = localToday()
  const hasComments = task.taskComments.length > 0
  return (
    <div
      // 左键详情 / 右键菜单：Step 5 接线，先阻止默认行为占位
      onClick={() => {}}
      onContextMenu={(e) => e.preventDefault()}
      title={task.title}
      className="cursor-pointer rounded-lg border border-neutral-200/80 dark:border-neutral-700/70
        bg-white dark:bg-neutral-900 px-2.5 py-2 transition-all
        hover:border-haruto-sea/50 hover:shadow-sm select-none"
    >
      <div
        className={`text-[13px] leading-snug break-all ${
          task.done ? 'line-through text-neutral-400' : 'text-neutral-700 dark:text-neutral-200'
        }`}
      >
        {task.title}
      </div>
      <div className="mt-1 flex items-center gap-2.5 text-[11px]">
        {/* 日期：今天紫色，其他深色文本；无日期不显示 */}
        {task.dueDate &&
          (task.dueDate === today ? (
            <span className="font-medium text-purple-500">今天</span>
          ) : (
            <span className="tabular-nums text-neutral-600 dark:text-neutral-300">
              {task.dueDate.slice(5).replace('-', '/')}
            </span>
          ))}
        {/* 专注分钟：有记录才显示（灰闹钟 + 分钟数） */}
        {minutes > 0 && (
          <span className="flex items-center gap-0.5 text-neutral-400 tabular-nums" title={`已专注 ${minutes} 分钟`}>
            <span className="[&>svg]:h-3 [&>svg]:w-3">
              <IconClock />
            </span>
            {minutes}分
          </span>
        )}
        {/* AI 留言气泡：有留言绿色（带条数），无留言灰色 */}
        <span
          className={`ml-auto flex items-center gap-0.5 ${
            hasComments ? 'text-[#6a994e]' : 'text-neutral-300 dark:text-neutral-600'
          }`}
          title={hasComments ? `${hasComments} 条留言` : '暂无留言'}
        >
          <span className="[&>svg]:h-3 [&>svg]:w-3">
            <IconChat />
          </span>
          {hasComments && <span className="tabular-nums">{task.taskComments.length}</span>}
        </span>
      </div>
    </div>
  )
}

/* ---------- Section 列：列头（重命名/＋新建任务/⋯六项菜单）+ 任务堆叠 + 已完成折叠区 + 删除确认 ---------- */
function SectionColumn({
  section,
  tasks,
  minutesOf,
  tags,
  subTags,
  renaming,
  onRequestRename,
  onRenameCommit,
  onRenameCancel,
  onAddTask,
  onInsertSection,
  onMoveSection,
  onDeleteSection,
}: {
  section: Section
  tasks: Task[]
  minutesOf: (id: string) => number
  tags: Tag[]
  subTags: SubTag[]
  renaming: boolean // 该列是否处于重命名态（App 的 renamingSectionId）
  onRequestRename: (id: string) => void
  onRenameCommit: (id: string, name: string) => void
  onRenameCancel: () => void
  onAddTask: (sectionId: string, title: string) => void
  onInsertSection: (sectionId: string, side: 'left' | 'right') => void
  onMoveSection: (sectionId: string, newSubTagId: string) => void
  onDeleteSection: (sectionId: string) => void
}) {
  const [doneOpen, setDoneOpen] = useState(false) // 已完成折叠区默认折叠
  const [addingTask, setAddingTask] = useState(false) // ＋ 行内新建任务
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null) // ⋯ 菜单
  const [confirmDelete, setConfirmDelete] = useState(false) // 删除确认 modal

  const sorted = sortTasksForSection(tasks)
  const undone = sorted.filter((t) => !t.done)
  const done = sorted.filter((t) => t.done)

  /* ⋯ 菜单：移动到… 用二级子菜单展示 H1 → H2 树（复用 FloatingMenu 的 submenu 能力） */
  const byOrder = (a: { isPinned: boolean; order: number }, b: { isPinned: boolean; order: number }) =>
    a.isPinned === b.isPinned ? a.order - b.order : a.isPinned ? -1 : 1
  const byPinned = (a: Tag, b: Tag) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) // H1 无 order，只按置顶
  const h2Entry = (st: SubTag): MenuEntry => ({
    label: (st.emoji ? `${st.emoji} ` : '') + st.name,
    onClick: () => onMoveSection(section.id, st.id),
  })
  const moveEntries: MenuEntry[] = [...tags]
    .sort(byPinned)
    .map((h1) => ({ label: h1.name, submenu: subTags.filter((st) => st.h1TagId === h1.id).sort(byOrder).map(h2Entry) }))
  const orphanH2s = subTags.filter((st) => st.h1TagId === '').sort(byOrder)
  if (orphanH2s.length) moveEntries.push({ label: '未分组', submenu: orphanH2s.map(h2Entry) })

  const menuEntries: MenuEntry[] = [
    { label: '重命名', onClick: () => onRequestRename(section.id) },
    { label: '在左侧添加分组', onClick: () => onInsertSection(section.id, 'left') },
    { label: '在右侧添加分组', onClick: () => onInsertSection(section.id, 'right') },
    { label: '移动到…', submenu: moveEntries },
    // 数据不变：done 任务本就渲染在折叠区，这里只负责展开
    { label: '聚合该组下已完成任务', onClick: () => setDoneOpen(true) },
    { label: '删除', danger: true, onClick: () => setConfirmDelete(true) },
  ]

  return (
    <div className="flex w-[260px] shrink-0 flex-col">
      {/* 列头：组名/重命名 input + ＋新建任务 + ⋯菜单 */}
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
            className="min-w-0 flex-1 rounded-md border border-haruto-sea bg-transparent px-1.5 py-0.5
              text-sm font-bold outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-neutral-700 dark:text-neutral-200">
            {section.name}
          </span>
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

      {/* 行内新建任务（＋ 触发，回车创建、Esc 取消） */}
      {addingTask && (
        <input
          autoFocus
          placeholder="添加任务…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              onAddTask(section.id, e.currentTarget.value.trim())
              e.currentTarget.value = ''
              setAddingTask(false)
            }
            if (e.key === 'Escape') setAddingTask(false)
          }}
          className="mb-2 w-full rounded-lg border border-dashed border-haruto-sea/50 bg-transparent
            px-3 py-1.5 text-[13px] outline-none focus:border-haruto-sea"
        />
      )}

      {/* 任务堆叠（空态：暂无任务） */}
      <div className="min-h-[48px] space-y-2">
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200/80 dark:border-neutral-700/60 px-2 py-3 text-center text-xs text-neutral-300 dark:text-neutral-600">
            暂无任务
          </div>
        ) : (
          undone.map((t) => <TaskCard key={t.id} task={t} minutes={minutesOf(t.id)} />)
        )}
      </div>

      {/* 已完成折叠区：默认折叠，灰色细线分隔 */}
      {done.length > 0 && (
        <div className="mt-3 border-t border-neutral-200/70 dark:border-neutral-700/60 pt-2">
          <button
            onClick={() => setDoneOpen((v) => !v)}
            className="flex items-center gap-1 rounded px-1 py-0.5 text-xs text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <IconChevron open={doneOpen} />
            已完成 {done.length}
          </button>
          {doneOpen && (
            <div className="mt-2 space-y-2">
              {done.map((t) => (
                <TaskCard key={t.id} task={t} minutes={minutesOf(t.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ⋯ 六项菜单 */}
      {menu && <FloatingMenu x={menu.x} y={menu.y} entries={menuEntries} onClose={() => setMenu(null)} />}

      {/* 删除确认 modal（Electron 禁 confirm） */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/30 animate-[fadeSlideIn_.15s_ease]"
          onMouseDown={(e) => e.target === e.currentTarget && setConfirmDelete(false)}
        >
          <div className="w-72 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-2xl p-5">
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
                className="flex-1 rounded-lg border border-neutral-200 py-2 text-xs text-neutral-500
                  transition-colors select-none hover:text-neutral-700 dark:border-neutral-600 dark:hover:text-neutral-200"
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

/* ---------- H2 区块头（emoji + 色点 + 名称，视图A/B 共用样式） ---------- */
function SubTagHeader({ st, large }: { st: SubTag; large?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 px-1 pb-2">
      {st.emoji ? (
        <span className="shrink-0 text-sm">{st.emoji}</span>
      ) : (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: st.color }} />
      )}
      <span className={`truncate font-bold text-neutral-800 dark:text-neutral-100 ${large ? 'text-[15px]' : 'text-sm'}`}>
        {st.name}
      </span>
    </div>
  )
}

/* ---------- 看板共享回调（App 下发） ---------- */
export interface BoardCallbacks {
  tags: Tag[]
  renamingSectionId: string | null
  onRequestRename: (id: string) => void
  onRenameCommit: (id: string, name: string) => void
  onRenameCancel: () => void
  onAddTaskToSection: (sectionId: string, title: string) => void
  onInsertSection: (sectionId: string, side: 'left' | 'right') => void
  onMoveSection: (sectionId: string, newSubTagId: string) => void
  onDeleteSection: (sectionId: string) => void
  onCreateSection: (subTagId: string) => void // H2 空状态「＋ 新建分组」入口
}

/* ---------- H2 空分组引导（视图A区块内/视图B主体共用） ---------- */
function EmptySectionsGuide({ subTagId, onCreate }: { subTagId: string; onCreate: (subTagId: string) => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-neutral-200/80 dark:border-neutral-700/60 px-3 py-3">
      <span className="text-xs text-neutral-300 dark:text-neutral-600">还没有分组</span>
      <button
        onClick={() => onCreate(subTagId)}
        className="rounded-lg border border-haruto-sea/40 bg-haruto-sea/5 px-2.5 py-1 text-xs text-haruto-sea
          transition-colors hover:border-haruto-sea hover:bg-haruto-sea/15"
      >
        ＋ 新建分组
      </button>
    </div>
  )
}

/* ---------- 看板主体 ---------- */
export default function BoardView({
  subTags,
  sections,
  tasks,
  focusSessions,
  tags,
  renamingSectionId,
  onRequestRename,
  onRenameCommit,
  onRenameCancel,
  onAddTaskToSection,
  onInsertSection,
  onMoveSection,
  onDeleteSection,
  onCreateSection,
  h1TagId,
  activeSubTagId,
}: {
  subTags: SubTag[]
  sections: Section[]
  tasks: Task[]
  focusSessions: FocusSession[]
  h1TagId: string | null // 视图A：当前 H1；视图B：选中 H2 的所属 H1（用于圈定未分组范围）
  activeSubTagId: string | null // 非空 = 视图B
} & BoardCallbacks) {
  // 任务 → 专注总分钟（卡片显示任务自己的记录；归并主任务统计是统计页的事）
  const minutesOf = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of focusSessions) m.set(s.taskId, (m.get(s.taskId) ?? 0) + s.minutes)
    return (id: string) => m.get(id) ?? 0
  }, [focusSessions])

  const byOrder = (a: { isPinned: boolean; order: number }, b: { isPinned: boolean; order: number }) =>
    a.isPinned === b.isPinned ? a.order - b.order : a.isPinned ? -1 : 1

  // SectionColumn 的公共回调束
  const colBase = {
    minutesOf,
    tags,
    subTags,
    renamingSectionId,
    onRequestRename,
    onRenameCommit,
    onRenameCancel,
    onAddTask: onAddTaskToSection,
    onInsertSection,
    onMoveSection,
    onDeleteSection,
  }

  /* ===== 视图B：H2 单标签看板 ===== */
  if (activeSubTagId) {
    const st = subTags.find((s) => s.id === activeSubTagId)
    if (!st) return <div className="grid h-full place-items-center text-sm text-neutral-400">标签不存在</div>
    const secs = sections.filter((s) => s.subTagId === st.id).sort((a, b) => a.order - b.order)
    const secIds = new Set(secs.map((s) => s.id))
    const ungrouped = tasks.filter((t) => t.tagId === st.h1TagId && (!t.sectionId || !secIds.has(t.sectionId)))

    return (
      <div className="flex h-full flex-col p-5">
        <div className="mb-4 flex items-center gap-2">
          <SubTagHeader st={st} large />
          <span className="text-xs text-neutral-400 tabular-nums">{secs.length} 个分组</span>
        </div>
        <div className="flex-1 overflow-x-auto pb-2">
          <div className="flex min-w-max items-start gap-3">
            {secs.length === 0 && <EmptySectionsGuide subTagId={st.id} onCreate={onCreateSection} />}
            {secs.map((sec) => (
              <SectionColumn
                key={sec.id}
                section={sec}
                tasks={tasks.filter((t) => t.sectionId === sec.id)}
                renaming={renamingSectionId === sec.id}
                {...colBase}
              />
            ))}
          </div>
        </div>
        {/* 未分组兜底（仅本 H1 范围内无分组的旧任务） */}
        {ungrouped.length > 0 && (
          <div className="mt-2 border-t border-neutral-200/70 dark:border-neutral-700/60 pt-3">
            <div className="px-1 pb-2 text-xs font-bold text-neutral-400">未分组 {ungrouped.length}</div>
            <div className="flex max-w-5xl flex-wrap gap-2">
              {sortTasksForSection(ungrouped).map((t) => (
                <div key={t.id} className="w-[248px]">
                  <TaskCard task={t} minutes={minutesOf(t.id)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ===== 视图A：H1 总览看板 ===== */
  const subs = subTags.filter((s) => s.h1TagId === h1TagId).sort(byOrder)
  const allSecIds = new Set(sections.filter((sec) => subs.some((st) => st.id === sec.subTagId)).map((s) => s.id))
  // 圈定范围：tagId 指向本 H1、或 section 属于本 H1 的任务；其中没有有效 section 的进未分组
  const inScope = tasks.filter((t) => t.tagId === h1TagId || (t.sectionId && allSecIds.has(t.sectionId)))
  const ungrouped = inScope.filter((t) => !t.sectionId || !allSecIds.has(t.sectionId))

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex-1 overflow-x-auto pb-2">
        <div className="flex min-w-max items-start">
          {subs.length === 0 && (
            <div className="rounded-lg border border-dashed border-neutral-200/80 dark:border-neutral-700/60 px-4 py-6 text-sm text-neutral-300 dark:text-neutral-600">
              该清单下还没有标签（L2 三点菜单 → 新建标签）
            </div>
          )}
          {subs.map((st, i) => {
            const secs = sections.filter((s) => s.subTagId === st.id).sort((a, b) => a.order - b.order)
            return (
              <div
                key={st.id}
                className={`flex shrink-0 items-start gap-3 ${
                  i > 0 ? 'ml-3 border-l border-neutral-200/70 pl-3 dark:border-neutral-700/60' : ''
                }`}
              >
                <div className="flex flex-col">
                  <SubTagHeader st={st} large />
                  <div className="flex flex-1 items-start gap-3">
                    {secs.length === 0 && <EmptySectionsGuide subTagId={st.id} onCreate={onCreateSection} />}
                    {secs.map((sec) => (
                      <SectionColumn
                        key={sec.id}
                        section={sec}
                        tasks={tasks.filter((t) => t.sectionId === sec.id)}
                        renaming={renamingSectionId === sec.id}
                        {...colBase}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {/* 未分组兜底 */}
      {ungrouped.length > 0 && (
        <div className="mt-2 border-t border-neutral-200/70 dark:border-neutral-700/60 pt-3">
          <div className="px-1 pb-2 text-xs font-bold text-neutral-400">未分组 {ungrouped.length}</div>
          <div className="flex max-w-5xl flex-wrap gap-2">
            {sortTasksForSection(ungrouped).map((t) => (
              <div key={t.id} className="w-[248px]">
                <TaskCard task={t} minutes={minutesOf(t.id)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
