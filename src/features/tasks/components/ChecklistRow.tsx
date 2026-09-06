// 检查事项行 + 添加行（RF-P2a 自 BoardView.tsx 原样迁入）：弹窗与右栏共用
import { useEffect, useRef, useState } from 'react'
import type { ChecklistItem } from '../../../shared/types'
import { IconBell } from '../../../shared/components/icons'

/* ---------- 检查事项行（悬空弹窗与右栏详情共用）：勾选 + 点击行内编辑 + 闹钟提醒 + 删除 ---------- */
export function ChecklistRow({
  item,
  onToggle,
  onUpdate,
  onDelete,
  onRemind,
}: {
  item: ChecklistItem
  onToggle: () => void
  onUpdate: (patch: Partial<ChecklistItem>) => void
  onDelete: () => void
  onRemind: () => void
}) {
  const [editing, setEditing] = useState(false)
  return (
    <div className="group flex items-center gap-2 rounded px-0.5 py-0.5 hover:bg-black/[0.03] dark:hover:bg-white/5">
      <input type="checkbox" checked={item.done} onChange={onToggle} className="h-4 w-4 shrink-0 accent-haruto-sea" />
      {editing ? (
        <input
          autoFocus
          defaultValue={item.text}
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v) onUpdate({ text: v })
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="min-w-0 flex-1 border-b border-haruto-sea bg-transparent text-xs outline-none"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`min-w-0 flex-1 cursor-text text-xs ${item.done ? 'text-neutral-400 line-through' : 'text-neutral-600 dark:text-neutral-300'}`}
        >
          {item.text}
        </span>
      )}
      <button
        onClick={onRemind}
        title={item.remindAt ? `已设提醒 ${new Date(item.remindAt).toLocaleString()}` : '设置提醒'}
        className={`shrink-0 transition-colors ${
          item.remindAt ? 'text-[#5b8c5a]' : 'text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-haruto-sea dark:text-neutral-600'
        }`}
      >
        <span className="[&>svg]:h-3 [&>svg]:w-3">
          <IconBell />
        </span>
      </button>
      <button
        onClick={onDelete}
        title="删除该事项"
        className="shrink-0 text-neutral-300 opacity-0 transition-colors group-hover:opacity-100 hover:text-red-500 dark:text-neutral-600"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>
  )
}

/* ---------- 检查事项添加行（弹窗/右栏共用，优化1）：回车保存并清空保持聚焦=连续添加；空行回车/Esc/失焦取消 ---------- */
export function ChecklistAddRow({
  onAdd,
  onCancel,
}: {
  onAdd: (text: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  return (
    <input
      ref={inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const v = text.trim()
          if (v) {
            onAdd(v)
            setText('') // 清空但不关闭：下一行立即可输入（连续添加）
          } else {
            onCancel()
          }
        }
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => {
        if (!text.trim()) onCancel()
        else {
          onAdd(text.trim())
          onCancel()
        }
      }}
      placeholder="事项内容，回车连续添加，Esc 结束"
      className="w-full rounded-lg border border-dashed border-haruto-sea/50 bg-transparent px-2 py-1 text-xs outline-none focus:border-haruto-sea"
    />
  )
}

