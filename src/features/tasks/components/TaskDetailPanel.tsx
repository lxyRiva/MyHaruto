// 右侧栏任务详情（今日/最近7天/全部页统一右栏，RF-P2b）。
// RF-Fix3c 第7项：内容区拆至 TaskDetailContent（与看板悬空弹窗同渲染），本壳只做右栏布局适配
// （× 收起由 MainArea 提供、动作行挂底部）；删除走 onDeleteRequest → MainArea 确认 modal
import type { ChecklistItem, Section, SubTag, Tag, Task } from '../../../shared/types'
import TaskDetailContent from './TaskDetailContent'

export default function TaskDetailPanel({
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
  onPomodoro,
  onDeleteRequest,
  onToggleChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
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
  onPomodoro: (t: Task) => void
  /** 请求删除（MainArea 弹确认 modal 后执行 deleteTaskTree） */
  onDeleteRequest: () => void
  onToggleChecklist: (taskId: string, itemId: string) => void
  onAddChecklistItem: (taskId: string, text: string) => void
  onUpdateChecklistItem: (taskId: string, itemId: string, patch: Partial<ChecklistItem>) => void
  onDeleteChecklistItem: (taskId: string, itemId: string) => void
}) {
  return (
    <>
      <TaskDetailContent
        task={task}
        aiName={aiName}
        tags={tags}
        subTags={subTags}
        sections={sections}
        childTasks={childTasks}
        onOpenSubTag={onOpenSubTag}
        onUpdateTask={onUpdateTask}
        onToggleDone={onToggleDone}
        onAddSubtask={onAddSubtask}
        onToggleChecklist={onToggleChecklist}
        onAddChecklistItem={onAddChecklistItem}
        onUpdateChecklistItem={onUpdateChecklistItem}
        onDeleteChecklistItem={onDeleteChecklistItem}
      />

      {/* 动作行（P2b 映射表：🍅开始专注 / 🗑删除；删除确认在 MainArea） */}
      <div className="mt-3 flex shrink-0 items-center gap-3">
        <button
          onClick={() => onPomodoro(task)}
          className="rounded-lg bg-haruto-sea px-3 py-1.5 text-xs text-white"
        >
          🍅 开始专注
        </button>
        <button
          onClick={onDeleteRequest}
          className="text-xs text-red-400 hover:text-red-500"
        >
          🗑 删除任务
        </button>
      </div>
    </>
  )
}
