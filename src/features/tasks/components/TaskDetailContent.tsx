// 任务详情内容区（RF-Fix3c 第7项拆分）：右栏 TaskDetailPanel 与看板悬空弹窗同渲染的
// 唯一内容实现（标题/徽章/日期行/子任务区块/描述·检查事项 tab/AI 留言）。
// 布局适配留在消费壳：右栏壳追加动作行，弹窗壳给固定宽度+滚动约束；日期编辑入口可选（onEditDate）。
// v1.7 硬性补注：子任务勾选走 onToggleDone（toggleTaskDone 树语义统一入口），禁止 updateTask 直改 done
import { useState } from 'react'
import type { ChecklistItem, Section, SubTag, Tag, Task } from '../../../shared/types'
import { IconChat, IconCheck, IconTasks } from '../../../shared/components/icons'
import { ChecklistAddRow, ChecklistRow } from './ChecklistRow'
import { RemindPicker } from './DateTimePickers'
import { checklistDefaultMode } from '../utils/taskMeta'

export default function TaskDetailContent({
  task,
  aiName,
  tags,
  subTags,
  sections,
  childTasks,
  onOpenSubTag,
  onUpdateTask,
  onToggleDone,
  onAddSubtask,
  onToggleChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onEditDate,
}: {
  task: Task
  aiName: string
  tags: Tag[]
  subTags: SubTag[]
  sections: Section[]
  childTasks: Task[]
  onOpenSubTag: (subTagId: string) => void
  onUpdateTask: (id: string, patch: Partial<Task>) => void
  onToggleDone: (id: string) => void
  onAddSubtask: (parentId: string, title: string) => void
  onToggleChecklist: (taskId: string, itemId: string) => void
  onAddChecklistItem: (taskId: string, text: string) => void
  onUpdateChecklistItem: (taskId: string, itemId: string, patch: Partial<ChecklistItem>) => void
  onDeleteChecklistItem: (taskId: string, itemId: string) => void
  /** 传入时日期行可点开日期编辑（悬空弹窗）；右栏不传 = 纯展示 */
  onEditDate?: () => void
}) {
  const [tab, setTab] = useState<'text' | 'checklist'>(checklistDefaultMode(task))
  const switchTab = (v: 'text' | 'checklist') => {
    setTab(v)
    if (v === 'checklist') setAddingItem(true) // 修正5：进入检查事项模式自动出现一行输入
  }
  const [addingItem, setAddingItem] = useState(false)
  const [remindFor, setRemindFor] = useState<string | null>(null)

  const dateRow = (
    <p className={`mt-1 text-[11px] text-neutral-400 ${onEditDate ? 'cursor-pointer hover:text-haruto-sea' : ''}`}
      onClick={onEditDate}
      title={onEditDate ? '点击修改日期与提醒' : undefined}
    >
      {task.dueDate ? `📅 ${task.dueDate}` : (onEditDate ? '📅 添加日期' : '无日期')} · 创建于 {task.createdAt.slice(0, 10)}
    </p>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 顶部：标题 + 文本/检查事项切换 */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 break-all text-[15px] font-semibold leading-snug">
          {task.done ? '✅ ' : ''}{task.title}
        </h2>
        {/* 修正5：单图标切换键（当前模式高亮） */}
        <button
          onClick={() => switchTab(tab === 'text' ? 'checklist' : 'text')}
          title={tab === 'text' ? '切换到检查事项' : '切换到任务文本'}
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border transition-colors ${
            tab === 'checklist'
              ? 'border-haruto-sea/50 bg-haruto-sea/10 text-haruto-sea'
              : 'border-neutral-200 text-neutral-400 hover:border-haruto-sea hover:text-haruto-sea dark:border-neutral-600'
          }`}
        >
          <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{tab === 'text' ? <IconCheck /> : <IconTasks />}</span>
        </button>
      </div>
      {/* 归属 badge：有 section 显示 H2（可点跳看板）；无 section 按 tagId 显示 H1 清单胶囊（P2b 映射表，兼容 H1-only）。
          日期行所有分支统一渲染（弹层自审回归修复：此前 H2 分支漏渲染 dateRow，弹窗开不了日期 modal） */}
      {(() => {
        const h2 = subTags.find((st) => st.id === sections.find((sec) => sec.id === task.sectionId)?.subTagId)
        if (h2) {
          return (
            <button
              onClick={() => onOpenSubTag(h2.id)}
              className="mt-1.5 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] transition-opacity hover:opacity-75"
              style={{ backgroundColor: h2.color + '22', color: h2.color }}
              title="查看该标签看板"
            >
              {h2.emoji ? <span>{h2.emoji}</span> : <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: h2.color }} />}
              <span className="font-medium underline decoration-dotted">{h2.name}</span>
            </button>
          )
        }
        const h1Tag = tags.find((t) => t.id === task.tagId)
        if (!h1Tag) return null
        return (
          <span
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px]"
            style={{ backgroundColor: h1Tag.color + '22', color: h1Tag.color }}
            title="所属清单"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: h1Tag.color }} />
            <span className="font-medium">{h1Tag.name}</span>
          </span>
        )
      })()}
      {dateRow}

      {/* 中部：详情区（可滚动） */}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {/* 子任务区块（P2b 映射表：勾选走 toggleTaskDone、行内添加、每条独立 🍅） */}
        <div className="mb-3 border-b border-neutral-100 pb-3 dark:border-neutral-700/60">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-neutral-500">
            <span>子任务</span>
            {childTasks.length > 0 && (
              <span>{childTasks.filter((c) => c.done).length}/{childTasks.length}</span>
            )}
          </div>
          {childTasks.map((c) => (
            <div key={c.id} className="group flex items-center gap-2.5 py-1.5">
              <input
                type="checkbox"
                checked={c.done}
                onChange={() => onToggleDone(c.id)}
                className="accent-haruto-sea w-3.5 h-3.5 shrink-0"
              />
              <span className={`flex-1 text-sm truncate ${c.done ? 'line-through text-neutral-400' : ''}`}>{c.title}</span>
              {onEditDate && <span className="shrink-0 text-xs opacity-40">🍅</span>}
            </div>
          ))}
          <input
            placeholder="+ 添加子任务，回车保存"
            className="mt-1 w-full text-sm rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700
              bg-transparent px-3 py-2 outline-none focus:border-haruto-sea"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                onAddSubtask(task.id, e.currentTarget.value.trim())
                e.currentTarget.value = ''
              }
            }}
          />
        </div>
        {tab === 'text' ? (
          <>
            <div className="text-xs font-medium text-neutral-500">描述</div>
            <textarea
              value={task.description}
              onChange={(e) => onUpdateTask(task.id, { description: e.target.value })}
              placeholder="写任务描述…"
              className="mt-1.5 h-40 w-full resize-none rounded-lg border border-neutral-200 bg-white p-3 text-sm
                outline-none transition-colors focus:border-haruto-sea dark:border-neutral-700 dark:bg-neutral-900"
            />
          </>
        ) : (
          <>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {task.description || <span className="text-neutral-300 dark:text-neutral-600">暂无描述</span>}
            </p>
            <div className="mt-2 border-t border-neutral-100 pt-2 dark:border-neutral-700/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">检查事项</span>
                <button onClick={() => setAddingItem(true)} title="添加事项" className="text-haruto-sea transition-colors hover:opacity-75">
                  <span className="block text-sm leading-none">＋</span>
                </button>
              </div>
              <div className="mt-1.5 space-y-1">
                {task.checklistItems.map((c) => (
                  <ChecklistRow
                    key={c.id}
                    item={c}
                    onToggle={() => onToggleChecklist(task.id, c.id)}
                    onUpdate={(patch) => onUpdateChecklistItem(task.id, c.id, patch)}
                    onDelete={() => onDeleteChecklistItem(task.id, c.id)}
                    onRemind={() => setRemindFor(c.id)}
                  />
                ))}
                {addingItem && (
                  <ChecklistAddRow
                    onAdd={(t) => onAddChecklistItem(task.id, t)}
                    onCancel={() => setAddingItem(false)}
                  />
                )}
                {task.checklistItems.length === 0 && !addingItem && (
                  <p className="py-1 text-xs text-neutral-300 dark:text-neutral-600">暂无检查事项</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 底部：AI 留言区（固定，M6 上线后显示留言；当前只读占位） */}
      <div className="mt-3 shrink-0 border-t border-neutral-100 pt-3 dark:border-neutral-700/60">
        <div className="flex items-center gap-1.5 text-[#6a994e]">
          <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">
            <IconChat />
          </span>
          <span className="text-xs font-medium">{aiName} 的留言</span>
        </div>
        <div className="mt-1.5 rounded-lg border border-dashed border-haruto-sea/30 p-2.5 text-xs italic text-haruto-sea/60">
          {task.taskComments.length ? task.taskComments.map((c) => c.content).join('\n') : '他还没有留言'}
        </div>
      </div>

      {/* 事项级提醒 picker */}
      {remindFor && (
        <RemindPicker
          onSave={(iso) => {
            onUpdateChecklistItem(task.id, remindFor, { remindAt: iso })
            setRemindFor(null)
          }}
          onCancel={() => setRemindFor(null)}
        />
      )}
    </div>
  )
}
