// 设置弹窗（当前仅 AI 名字）。RF-P3b 自 App 原样迁出：
// showSettings 开关留 App 受控（App 条件渲染 = 每次打开重新挂载、草稿重置为当前 aiName）；
// 保存经 onSave 上抛，由 App 内联 setDb 写 settings.aiName（写入后由 db useEffect 自动持久化）
// v1.16：Escape 改容器级（原 input 局部 onKeyDown 焦点依赖是原病灶）；input 内 Enter 保存语义保留
// RF-Data-1：新增「数据」区块（打开数据文件夹，onOpenDataDir 由 App 注入，组件不直接碰 repository）
import { useEffect, useState } from 'react'

export default function SettingsModal({ open, onClose, aiName, onSave, onOpenDataDir }: {
  open: boolean
  onClose: () => void
  aiName: string
  onSave: (v: string) => void
  onOpenDataDir: () => void
}) {
  const [aiNameDraft, setAiNameDraft] = useState(aiName)

  // 原保存语义：空值直接 return（不关弹窗；保存按钮同时 disabled）
  const saveSettings = () => {
    const v = aiNameDraft.trim()
    if (!v) return
    onSave(v)
    onClose()
  }

  // v1.16：容器级 Escape 关闭（对齐 FloatingMenu 写法）
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-80 rounded-xl bg-white dark:bg-neutral-800 shadow-xl border border-neutral-200 dark:border-neutral-700 p-5 animate-[fadeSlideIn_.15s_ease]">
        <div className="text-sm font-semibold mb-4">设置</div>
        <div className="text-xs text-neutral-500 mb-1.5">AI 名字</div>
        <input
          autoFocus
          value={aiNameDraft}
          onChange={(e) => setAiNameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveSettings()
          }}
          placeholder="AI 角色显示名"
          className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700
            bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-haruto-sea"
        />
        {/* RF-Data-1：数据区块（Data-2 扩展为数据位置管理：当前路径/更改/打开） */}
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <div className="text-xs text-neutral-500 mb-1.5">数据</div>
          <button
            onClick={onOpenDataDir}
            className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600
              text-neutral-600 dark:text-neutral-300 hover:border-haruto-sea hover:text-haruto-sea
              transition-colors"
          >
            打开数据文件夹
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300"
          >
            取消
          </button>
          <button
            onClick={saveSettings}
            disabled={!aiNameDraft.trim()}
            className="text-xs px-3 py-1.5 rounded-lg bg-haruto-sea text-white disabled:opacity-40 disabled:cursor-default"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
