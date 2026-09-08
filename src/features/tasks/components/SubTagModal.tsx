// H2 标签新建/编辑弹窗（RF-P1 自 App.tsx 原样迁入）+ 色板/emoji 预设随迁导出
// v1.16：容器级 Escape 关闭（原仅 name input Enter 局部监听；Escape 不依赖焦点）
import { useEffect, useState } from 'react'

// L2 新建清单 6 色板（原 App.tsx PALETTE 原样迁入并导出）
export const PALETTE = ['#3d7ea6', '#5b8c5a', '#c97b4a', '#8e6bb3', '#b85c5c', '#4a9e9e']

// H2 标签 18 色板（新建/编辑标签 modal 用）
export const H2_PALETTE = [
  '#3d7ea6', '#5b8c5a', '#c97b4a', '#8e6bb3', '#b85c5c', '#4a9e9e',
  '#d4a017', '#e07a5f', '#6a994e', '#7a6ff0', '#f2a900', '#00a3a3',
  '#e56db1', '#5c7cfa', '#8d6e63', '#607d8b', '#c2185b', '#7cb342',
]

// H2 标签 emoji 预设（用户数据，允许 emoji；点击填入输入框，也可手动输入自定义）
export const EMOJI_PRESETS = ['📝', '📞', '💻', '📊', '📚', '🎯', '🧘‍♀️', '💪', '🛒', '✈️', '🎨', '🏠']

// H2 标签新建/编辑弹窗：emoji（最多2字符）+ 名称（必填）+ 18色板
export default function SubTagModal({ title, initial, onSave, onCancel }: {
  title: string
  initial: { emoji: string; name: string; color: string }
  onSave: (v: { emoji: string; name: string; color: string }) => void
  onCancel: () => void
}) {
  const [emoji, setEmoji] = useState(initial.emoji)
  const [name, setName] = useState(initial.name)
  const [color, setColor] = useState(initial.color)
  const ok = name.trim().length > 0
  // 按码点切防止截半个字符；含 ZWJ(\u200D) 的组合 emoji（如 🧘‍♀️）是一个整体，保留不切
  const clampEmoji = (v: string) => (v.includes('\u200D') ? v : Array.from(v).slice(0, 2).join(''))
  const submit = () => ok && onSave({ emoji: clampEmoji(emoji), name: name.trim(), color })

  // v1.16：容器级 Escape（name input 的 Enter=提交语义保留在 input onKeyDown）
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-80 rounded-xl bg-white dark:bg-neutral-800 shadow-xl border border-neutral-200 dark:border-neutral-700 p-5 animate-[fadeSlideIn_.15s_ease]">
        <div className="text-sm font-semibold mb-4">{title}</div>
        <div className="flex gap-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(clampEmoji(e.target.value))}
            placeholder="图标"
            title="显示在标签名前，可留空"
            className="w-12 text-center rounded-lg border border-neutral-200 dark:border-neutral-700
              bg-white dark:bg-neutral-900 px-2 py-2 text-sm outline-none focus:border-haruto-sea"
          />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="标签名称（必填）"
            className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-700
              bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-haruto-sea"
          />
        </div>
        {/* emoji 预设选择器：点击填入输入框（输入框仍可手动输入自定义） */}
        <div className="mt-2 flex flex-wrap gap-1">
          {EMOJI_PRESETS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              title="点击选用"
              className={`w-7 h-7 grid place-items-center rounded-md text-sm transition-colors
                ${emoji === e
                  ? 'bg-haruto-sea/15 ring-1 ring-haruto-sea'
                  : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="mt-4 mb-2 text-xs text-neutral-500">颜色</div>
        <div className="grid grid-cols-9 gap-1.5">
          {H2_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full transition-transform hover:scale-110
                ${color === c ? 'ring-2 ring-offset-2 ring-neutral-400 dark:ring-offset-neutral-800' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={!ok}
            className="text-xs px-3 py-1.5 rounded-lg bg-haruto-sea text-white disabled:opacity-40 disabled:cursor-default"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  )
}
