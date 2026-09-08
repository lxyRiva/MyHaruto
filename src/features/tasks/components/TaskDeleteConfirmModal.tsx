// 任务删除确认 modal（RF-Fix3c 抽共享：横板 ListTaskCard 与看板 TaskCard 的同款确认框唯一化）
// 纯展示组件：文案 + 确认/取消回调；删除动作由消费层接线（§10 视图只做布局适配）
// v1.16：容器级 Escape 关闭（对齐 FloatingMenu 写法）
import { useEffect } from 'react'

export default function TaskDeleteConfirmModal({ taskTitle, onConfirm, onCancel }: {
  taskTitle: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/30 animate-[fadeSlideIn_.15s_ease]"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-72 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800">
        <div className="text-sm font-semibold select-none">删除该任务及其所有子任务？</div>
        <div className="mt-1 text-xs text-neutral-400 select-none">{taskTitle}</div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-medium text-white transition-opacity select-none hover:opacity-90"
          >
            确认删除
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-neutral-200 py-2 text-xs text-neutral-500 transition-colors select-none hover:text-neutral-700 dark:border-neutral-600 dark:hover:text-neutral-200"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
