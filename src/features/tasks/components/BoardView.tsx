// 看板视图主文件（RF-P2a 拆分后）：视图A=H1总览 / 视图B=H2单标签；拆分件见同目录
import { useMemo, useState } from 'react'
import type { ChecklistItem, FocusSession, Section, SubTag, Tag, Task } from '../../../shared/types'
import type { Priority } from '../types'
import { IconChevron } from '../../../shared/components/icons'
import TaskCard from './TaskCard'
import { default as SectionColumn } from './BoardColumn'
import { taskSort, pinnedGroupFirst } from '../utils/taskSort'
import type { CardBundle } from './taskMenu'

/* ---------- H2 空分组引导 ---------- */
function EmptySectionsGuide({ subTagId, onCreate }: { subTagId: string; onCreate: (subTagId: string) => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-neutral-200/80 px-3 py-3 dark:border-neutral-700/60">
      <span className="text-xs text-neutral-300 dark:text-neutral-600">还没有分组</span>
      <button
        onClick={() => onCreate(subTagId)}
        className="rounded-lg border border-haruto-sea/40 bg-haruto-sea/5 px-2.5 py-1 text-xs text-haruto-sea transition-colors hover:border-haruto-sea hover:bg-haruto-sea/15"
      >
        ＋ 新建分组
      </button>
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
      <span className={`truncate font-bold text-neutral-800 dark:text-neutral-100 ${large ? 'text-[15px]' : 'text-sm'}`}>{st.name}</span>
    </div>
  )
}

/* ---------- 看板主体回调（App 下发） ---------- */
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
  onCreateSection: (subTagId: string) => void
  onAggregateDone: (sectionId: string) => void
  // Step 5 任务卡片
  aiName: string
  onToggleDone: (id: string) => void
  onToggleChecklist: (taskId: string, itemId: string) => void
  onAddChecklistItem: (taskId: string, text: string) => void
  onUpdateChecklistItem: (taskId: string, itemId: string, patch: Partial<ChecklistItem>) => void
  onDeleteChecklistItem: (taskId: string, itemId: string) => void
  onSetTaskReminder: (id: string, remindAt: string | null, remindDaysBefore: number | null) => void
  onUpdateTaskDue: (id: string, dueDate: string | null) => void
  onUpdateTask: (id: string, patch: Partial<Task>) => void
  onAddSubtask: (parentId: string, title: string) => void
  onUpdateTag: (id: string, tagId: string | null) => void
  onUpdateTaskSection: (id: string, sectionId: string | null) => void
  onTogglePinned: (id: string) => void
  onSetPriority: (id: string, p: Priority) => void
  onSetMasterTask: (id: string, masterId: string | null) => void
  onPomodoro: (t: Task) => void
  onDeleteTaskTree: (id: string) => void
  onOpenSubTag: (subTagId: string) => void
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
  onAggregateDone,
  aiName,
  onToggleDone,
  onToggleChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onSetTaskReminder,
  onUpdateTaskDue,
  onUpdateTask,
  onAddSubtask,
  onUpdateTag,
  onUpdateTaskSection,
  onTogglePinned,
  onSetPriority,
  onSetMasterTask,
  onPomodoro,
  onDeleteTaskTree,
  onOpenSubTag,
  h1TagId,
  activeSubTagId,
}: {
  subTags: SubTag[]
  sections: Section[]
  tasks: Task[]
  focusSessions: FocusSession[]
  h1TagId: string | null
  activeSubTagId: string | null
} & BoardCallbacks) {
  const minutesOf = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of focusSessions) m.set(s.taskId, (m.get(s.taskId) ?? 0) + s.minutes)
    return (id: string) => m.get(id) ?? 0
  }, [focusSessions])

  const byOrder = (a: { isPinned: boolean; order: number }, b: { isPinned: boolean; order: number }) =>
    a.isPinned === b.isPinned ? a.order - b.order : a.isPinned ? -1 : 1
  const sortUngrouped = (list: Task[]) => pinnedGroupFirst([...list].sort(taskSort)) // 置顶该组排集合首（RF-P3）

  // 悬空弹窗全局互斥：同一时刻只有一张卡片的弹窗（Bug1 修复）
  const [activePopupId, setActivePopupId] = useState<string | null>(null)

  const card: CardBundle = {
    minutesOf,
    allTasks: tasks,
    aiName,
    tags,
    subTags,
    sections,
    activePopupId,
    onRequestPopup: (id) => setActivePopupId(id),
    onClosePopup: () => setActivePopupId(null),
    onToggleDone,
    onToggleChecklist,
    onAddChecklistItem,
    onUpdateChecklistItem,
    onDeleteChecklistItem,
    onSetTaskReminder,
    onUpdateTaskDue,
    onUpdateTask,
    onAddSubtask,
    onUpdateTag,
    onUpdateTaskSection,
    onTogglePinned,
    onSetPriority,
    onSetMasterTask,
    onPomodoro,
    onDeleteTaskTree,
    onOpenSubTag,
  }
  const colBase = {
    card,
    renamingSectionId,
    onRequestRename,
    onRenameCommit,
    onRenameCancel,
    onAddTaskToSection,
    onInsertSection,
    onMoveSection,
    onDeleteSection,
    onAggregateDone,
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
        {ungrouped.length > 0 && (
          <div className="mt-2 flex h-1/3 shrink-0 flex-col border-t border-neutral-200/70 pt-3 dark:border-neutral-700/60">
            <div className="px-1 pb-2 text-xs font-bold text-neutral-400">未分组 {ungrouped.length}</div>
            <div className="flex max-w-5xl flex-1 flex-wrap content-start gap-2 overflow-y-auto">
              {sortUngrouped(ungrouped)
                .filter((t) => !t.parentTaskId)
                .map((t) => (
                  <div key={t.id} className="w-[248px]">
                    <TaskCard task={t} columnTasks={ungrouped} foldedIds={new Set<string>()} parentFolded={false} depth={0} seen={new Set([t.id])} {...card} />
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
  const inScope = tasks.filter((t) => t.tagId === h1TagId || (t.sectionId && allSecIds.has(t.sectionId)))
  const ungrouped = inScope.filter((t) => !t.sectionId || !allSecIds.has(t.sectionId))

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex-1 overflow-x-auto pb-2">
        <div className="flex min-w-max items-start">
          {subs.length === 0 && (
            <div className="rounded-lg border border-dashed border-neutral-200/80 px-4 py-6 text-sm text-neutral-300 dark:border-neutral-700/60 dark:text-neutral-600">
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
      {ungrouped.length > 0 && (
        <div className="mt-2 border-t border-neutral-200/70 pt-3 dark:border-neutral-700/60">
          <div className="px-1 pb-2 text-xs font-bold text-neutral-400">未分组 {ungrouped.length}</div>
          <div className="flex max-w-5xl flex-wrap gap-2">
            {sortUngrouped(ungrouped)
              .filter((t) => !t.parentTaskId)
              .map((t) => (
                <div key={t.id} className="w-[248px]">
                  <TaskCard task={t} columnTasks={ungrouped} foldedIds={new Set<string>()} parentFolded={false} depth={0} seen={new Set([t.id])} {...card} />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
