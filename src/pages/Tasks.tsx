// 任务页：标签筛选 + 分组列表 + 新建标签（SPEC F1 标签式分类，特殊标签排最前）
import { useState } from 'react'
import type { Task, Tag } from '../types'
import { TaskList, todayStr } from './Today'

const PALETTE = ['#3d7ea6', '#5b8c5a', '#c97b4a', '#8e6bb3', '#b85c5c', '#4a9e9e']

export default function Tasks(props: {
  tasks: Task[]
  tags: Tag[]
  onAdd: (title: string, dueDate: string | null, tagId: string | null) => void
  onAddTag: (name: string, color: string) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  onPomodoro: (t: Task) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { tasks, tags, onAdd, onAddTag, onUpdate, onDelete, onPomodoro, selectedId, onSelect } = props
  const [activeTag, setActiveTag] = useState<string>('all')
  const [addingTag, setAddingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(PALETTE[0])

  const sortedTags = [...tags].sort((a, b) => Number(b.isSpecial) - Number(a.isSpecial))
  const tagMap = new Map(tags.map((t) => [t.id, t]))
  const mainTasks = tasks.filter((t) => !t.parentTaskId)
  const filtered = mainTasks.filter((t) => activeTag === 'all' || t.tagId === activeTag)

  const today = todayStr()
  const groups: { name: string; items: Task[] }[] = [
    { name: '今天', items: filtered.filter((t) => !t.done && t.dueDate === today) },
    { name: '即将到来', items: filtered.filter((t) => !t.done && t.dueDate && t.dueDate > today) },
    { name: '更早', items: filtered.filter((t) => !t.done && t.dueDate && t.dueDate < today) },
    { name: '无日期', items: filtered.filter((t) => !t.done && !t.dueDate) },
  ]
  const done = filtered.filter((t) => t.done)

  const listProps = { tagMap, allTasks: tasks, onUpdate, onDelete, onPomodoro, selectedId, onSelect }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold">任务</h1>

      {/* 标签筛选条：全部 | 各标签(特殊标签在前) | ➕ */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTag('all')}
          className={`text-xs px-3 py-1.5 rounded-full border
            ${activeTag === 'all'
              ? 'border-haruto-sea bg-haruto-sea/10 text-haruto-sea font-medium'
              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'}`}
        >
          全部
        </button>
        {sortedTags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => setActiveTag(tag.id)}
            className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5
              ${activeTag === tag.id ? 'font-medium' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'}`}
            style={activeTag === tag.id
              ? { borderColor: tag.color, backgroundColor: tag.color + '18', color: tag.color }
              : undefined}
          >
            {tag.isSpecial && <span>⭐</span>}
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
            {tag.name}
          </button>
        ))}
        {addingTag ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTagName.trim()) {
                  onAddTag(newTagName.trim(), newTagColor)
                  setNewTagName('')
                  setAddingTag(false)
                }
                if (e.key === 'Escape') setAddingTag(false)
              }}
              placeholder="标签名，回车创建"
              className="text-xs w-32 rounded-full border border-neutral-300 dark:border-neutral-600
                bg-white dark:bg-neutral-900 px-3 py-1.5 outline-none focus:border-haruto-sea"
            />
            <div className="flex gap-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewTagColor(c)}
                  className={`w-4 h-4 rounded-full ${newTagColor === c ? 'ring-2 ring-offset-1 ring-neutral-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingTag(true)}
            className="text-xs px-3 py-1.5 rounded-full border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-400 hover:border-haruto-sea hover:text-haruto-sea"
          >
            ＋ 标签
          </button>
        )}
      </div>

      {/* 新建任务：标题 + 日期，归属当前选中标签 */}
      <div className="mt-4 flex gap-2">
        <input
          placeholder={`新任务${activeTag !== 'all' ? ` → ${tagMap.get(activeTag)?.name}` : ''}，回车保存`}
          className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-700
            bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm outline-none focus:border-haruto-sea"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              const dateInput = document.getElementById('new-date') as HTMLInputElement
              onAdd(e.currentTarget.value.trim(), dateInput.value || null, activeTag === 'all' ? null : activeTag)
              e.currentTarget.value = ''
            }
          }}
        />
        <input
          id="new-date"
          type="date"
          className="rounded-lg border border-neutral-200 dark:border-neutral-700
            bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm outline-none focus:border-haruto-sea"
        />
      </div>

      {groups.map((g) => (
        <TaskList key={g.name} label={`${g.name} ${g.items.length}`} tasks={g.items} {...listProps} />
      ))}
      <TaskList label={`已完成 ${done.length}`} tasks={done} {...listProps} />
    </div>
  )
}
