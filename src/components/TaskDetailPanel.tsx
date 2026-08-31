// 右侧栏任务详情（今日/最近7天视图）：标题 + 文本/检查事项切换 + 底部 AI 留言区（占底部固定）
// 上部详情区可滚动，底部留言区固定；检查事项行复用看板的 ChecklistRow
import { useState } from 'react'
import type { ChecklistItem, Section, SubTag, Task } from '../types'
import { IconChat, IconCheck, IconTasks } from './icons'
import { ChecklistAddRow, ChecklistRow, RemindPicker, type Priority } from './BoardView'

export default function TaskDetailPanel({
  task,
  aiName,
  subTags,
  sections,
  onOpenSubTag,
  onUpdateTask,
  onToggleChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
}: {
  task: Task
  aiName: string
  subTags: SubTag[]
  sections: Section[]
  onOpenSubTag: (subTagId: string) => void
  onUpdateTask: (id: string, patch: Partial<Task>) => void
  onToggleChecklist: (taskId: string, itemId: string) => void
  onAddChecklistItem: (taskId: string, text: string) => void
  onUpdateChecklistItem: (taskId: string, itemId: string, patch: Partial<ChecklistItem>) => void
  onDeleteChecklistItem: (taskId: string, itemId: string) => void
}) {
  const [tab, setTab] = useState<'text' | 'checklist'>('text')
  const switchTab = (v: 'text' | 'checklist') => {
    setTab(v)
    if (v === 'checklist') setAddingItem(true) // 修正5：进入检查事项模式自动出现一行输入
  }
  const [addingItem, setAddingItem] = useState(false)
  const [remindFor, setRemindFor] = useState<string | null>(null)

  return (
    <div className="flex h-full flex-col">
      {/* 顶部：标题 + 文本/检查事项切换 */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 break-all text-[15px] font-semibold leading-snug">{task.title}</h2>
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
      {/* H2 归属 badge（可点跳看板，修正4） */}
      {(() => {
        const h2 = subTags.find((st) => st.id === sections.find((sec) => sec.id === task.sectionId)?.subTagId)
        if (!h2) return null
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
      })()}
      <p className="mt-1 text-[11px] text-neutral-400">创建于 {task.createdAt.slice(0, 10)}</p>

      {/* 中部：详情区（可滚动） */}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
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
