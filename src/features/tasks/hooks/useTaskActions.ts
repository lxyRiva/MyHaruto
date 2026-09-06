// 任务/清单/检查事项 数据变更动作（RF-P1 自 App.tsx 原样迁入，逻辑零改动）
import { useState, type Dispatch, type SetStateAction } from 'react'
import type { ChecklistItem, Db, Section, SubTag, Tag, Task } from '../../../types'
import { uid } from '../../../shared/utils/id'

export function useTaskActions(db: Db, setDb: Dispatch<SetStateAction<Db>>) {
  // ---------- 任务 ----------
  const addTask = (title: string, dueDate: string | null, tagId: string | null) =>
    setDb((d) => ({
      ...d,
      tasks: [
        { id: uid(), title, description: '', dueDate, done: false, createdAt: new Date().toISOString(),
          tagId, parentTaskId: null, priority: 'none', masterTaskId: null, isPinnedToday: false,
          sectionId: null, checklistItems: [], taskComments: [] },
        ...d.tasks,
      ],
    }))

  // 带选项新建（今日/最近7天新建行）：优先级 + tagId（H2 的 h1TagId）+ 日期；sectionId null
  const addTaskWithOptions = (
    title: string,
    opts: { dueDate?: string | null; priority?: NonNullable<Task['priority']>; tagId?: string | null }
  ) =>
    setDb((d) => ({
      ...d,
      tasks: [
        { id: uid(), title, description: '', dueDate: opts.dueDate ?? null, done: false, createdAt: new Date().toISOString(),
          tagId: opts.tagId ?? null, parentTaskId: null, priority: opts.priority ?? 'none', masterTaskId: null, isPinnedToday: false,
          sectionId: null, checklistItems: [], taskComments: [] },
        ...d.tasks,
      ],
    }))

  const addSubtask = (parentId: string, title: string) =>
    setDb((d) => ({
      ...d,
      tasks: [
        ...d.tasks,
        { id: uid(), title, description: '', dueDate: null, done: false, createdAt: new Date().toISOString(),
          tagId: d.tasks.find((t) => t.id === parentId)?.tagId ?? null, parentTaskId: parentId, priority: 'none',
          sectionId: null, checklistItems: [], taskComments: [] },
      ],
    }))

  const updateTask = (id: string, patch: Partial<Task>) =>
    setDb((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))

  const deleteTask = (id: string) =>
    setDb((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id && t.parentTaskId !== id) }))

  // 看板右键删除：递归删除目标 + 全部子孙（修正2）
  const deleteTaskRecursive = (id: string) =>
    setDb((d) => {
      const ids = new Set<string>([id])
      let grew = true
      while (grew) {
        grew = false
        for (const t of d.tasks) {
          if (t.parentTaskId && ids.has(t.parentTaskId) && !ids.has(t.id)) {
            ids.add(t.id)
            grew = true
          }
        }
      }
      return { ...d, tasks: d.tasks.filter((t) => !ids.has(t.id)) }
    })

  const updateTaskTag = (id: string, tagId: string | null) => updateTask(id, { tagId })

  // 移动任务到其他 Section：目标任务 + 全部子孙的 sectionId 一并更新，tagId 同步为目标 Section 所属 H1
  const updateTaskSection = (id: string, sectionId: string | null) =>
    setDb((d) => {
      if (!d.tasks.some((t) => t.id === id)) return d
      const ids = new Set<string>([id])
      let grew = true
      while (grew) {
        grew = false
        for (const t of d.tasks) {
          if (t.parentTaskId && ids.has(t.parentTaskId) && !ids.has(t.id)) {
            ids.add(t.id)
            grew = true
          }
        }
      }
      const h1TagId = d.subTags.find((st) => st.id === d.sections.find((s) => s.id === sectionId)?.subTagId)?.h1TagId || null
      return {
        ...d,
        tasks: d.tasks.map((t) => (ids.has(t.id) ? { ...t, sectionId, tagId: sectionId ? h1TagId : null } : t)),
      }
    })

  // 勾选/取消完成（RF-Fix1 聚合语义树化，规则 4/6 用户拍板）：
  //   树 = 主任务 + 全部子孙（parentTaskId 链）；折叠区成员判定唯一依据 = 根任务的 aggregated
  //   规则1 勾主任务 → 级联整树 done + aggregated 入折叠区
  //   规则2 主任务已完成且全部子孙已完成（任意路径达成）→ 根 aggregated=true 自动聚合
  //   规则3 勾子任务 → 仅自身 done，不触发聚合（除非恰达成规则2）
  //   规则4 折叠区取消主勾 → 根 done=false + 整树 aggregated 清除回待办；子孙 done 保留（拍板）
  //   规则5 折叠区取消任一子孙勾 → 整树 aggregated 清除回待办；自身 done=false，其余 done 保持
  //   规则7 回区后重新达成规则1/2 → 再次自动聚合（可循环）
  const toggleTaskDone = (id: string) =>
    setDb((d) => {
      const target = d.tasks.find((t) => t.id === id)
      if (!target) return d
      // 沿 parentTaskId 上溯取根任务（防环）
      const rootOf = (tid: string) => {
        let cur: Task | undefined = d.tasks.find((t) => t.id === tid)
        const seen = new Set<string>([tid])
        while (cur !== undefined && cur.parentTaskId && !seen.has(cur.parentTaskId)) {
          seen.add(cur.parentTaskId)
          const next: Task | undefined = d.tasks.find((t) => t.id === cur!.parentTaskId)
          cur = next
        }
        return cur
      }
      const root = rootOf(id)
      if (!root) return d
      // 树 = 根 + 全部子孙
      const treeIds = new Set<string>([root.id])
      let grew = true
      while (grew) {
        grew = false
        for (const t of d.tasks) {
          if (t.parentTaskId && treeIds.has(t.parentTaskId) && !treeIds.has(t.id)) {
            treeIds.add(t.id)
            grew = true
          }
        }
      }
      const inTree = (t: Task) => treeIds.has(t.id)
      const willBeDone = !target.done

      if (willBeDone) {
        if (target.id === root.id) {
          // 规则1：勾主任务 → 级联整树完成并聚合
          return { ...d, tasks: d.tasks.map((t) => (inTree(t) ? { ...t, done: true, aggregated: true } : t)) }
        }
        // 规则3：勾子任务 → 仅自身完成；若恰达成规则2（根已完成且全树完成）→ 自动聚合
        const after = d.tasks.map((t) => (inTree(t) && t.id === id ? { ...t, done: true } : t))
        const allTreeDone = after.filter(inTree).every((t) => t.done)
        if (root.done && allTreeDone) {
          return { ...d, tasks: after.map((t) => (inTree(t) ? { ...t, aggregated: true } : t)) }
        }
        return {
          ...d,
          tasks: d.tasks.map((t) => (t.id === id ? { ...t, done: true } : t)),
        }
      }

      if (target.id === root.id) {
        // 规则4：取消主勾 → 根 done=false + 整树 aggregated 清除回待办；子孙 done 保留
        return {
          ...d,
          tasks: d.tasks.map((t) =>
            inTree(t)
              ? t.id === root.id
                ? { ...t, done: false, aggregated: false }
                : { ...t, aggregated: false }
              : t
          ),
        }
      }
      // 规则5：取消子孙勾 → 整树 aggregated 清除回待办；自身 done=false，其余 done 保持
      return {
        ...d,
        tasks: d.tasks.map((t) => {
          if (t.id === id) return { ...t, done: false, aggregated: false }
          if (inTree(t) && t.aggregated) return { ...t, aggregated: false }
          return t
        }),
      }
    })

  // 聚合：把该 Section 下所有 done=true 的任务标记进「已完成」折叠区（数据标记，渲染层按此分区）
  const aggregateSectionDone = (sectionId: string) =>
    setDb((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.sectionId === sectionId && t.done ? { ...t, aggregated: true } : t)),
    }))

  // 看板内加子任务：sectionId/tagId 继承父任务
  const addSubtaskInline = (parentId: string, title: string) =>
    setDb((d) => {
      const p = d.tasks.find((t) => t.id === parentId)
      return {
        ...d,
        tasks: [
          ...d.tasks,
          {
            id: uid(), title, description: '', dueDate: null, done: false, createdAt: new Date().toISOString(),
            tagId: p?.tagId ?? null, parentTaskId: parentId, priority: 'none', masterTaskId: null, isPinnedToday: false,
            sectionId: p?.sectionId ?? null, checklistItems: [], taskComments: [],
          },
        ],
      }
    })

  const togglePinnedToday = (id: string) =>
    setDb((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, isPinnedToday: !t.isPinnedToday } : t)) }))

  // 关联主任务（任务2）：时长归并由 Stats.rootTaskIdOf 沿 parentTaskId+masterTaskId 链处理
  const setMasterTask = (id: string, masterTaskId: string | null) => updateTask(id, { masterTaskId })

  const setTaskPriority = (id: string, priority: NonNullable<Task['priority']>) => updateTask(id, { priority })

  // 任务级提醒（日期选择器「让 ta 提醒」）：remindAt = 提醒时刻 ISO，remindDaysBefore = 提前天数（0=当天）
  const setTaskReminder = (id: string, remindAt: string | null, remindDaysBefore: number | null) =>
    updateTask(id, { remindAt, remindDaysBefore })
  const updateTaskDue = (id: string, dueDate: string | null) => updateTask(id, { dueDate })

  // 在指定 Section 下新建任务：tagId 归属到该 Section 所属 H2 的 h1TagId（游离 H2 归 null）
  const addTaskToSection = (sectionId: string, title: string) =>
    setDb((d) => {
      const sec = d.sections.find((s) => s.id === sectionId)
      const h1TagId = d.subTags.find((st) => st.id === sec?.subTagId)?.h1TagId || null
      return {
        ...d,
        tasks: [
          {
            id: uid(), title, description: '', dueDate: null, done: false, createdAt: new Date().toISOString(),
            tagId: h1TagId, parentTaskId: null, priority: 'none', masterTaskId: null, isPinnedToday: false,
            sectionId, checklistItems: [], taskComments: [],
          },
          ...d.tasks,
        ],
      }
    })

  // ---------- 检查事项 ----------
  const toggleChecklistItem = (taskId: string, itemId: string) =>
    setDb((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === taskId
          ? { ...t, checklistItems: t.checklistItems.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }
          : t
      ),
    }))

  // 检查事项 CRUD（Step 5a 悬空弹窗）
  const addChecklistItem = (taskId: string, text: string) =>
    setDb((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === taskId
          ? { ...t, checklistItems: [...t.checklistItems, { id: uid(), text, done: false, remindAt: null }] }
          : t
      ),
    }))

  const updateChecklistItem = (taskId: string, itemId: string, patch: Partial<ChecklistItem>) =>
    setDb((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === taskId
          ? { ...t, checklistItems: t.checklistItems.map((c) => (c.id === itemId ? { ...c, ...patch } : c)) }
          : t
      ),
    }))

  const deleteChecklistItem = (taskId: string, itemId: string) =>
    setDb((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === taskId ? { ...t, checklistItems: t.checklistItems.filter((c) => c.id !== itemId) } : t
      ),
    }))

  // ---------- 清单（H1）与标签（H2） ----------
  const addTag = (name: string, color: string) =>
    setDb((d) => ({ ...d, tags: [...d.tags, { id: uid(), name, color, isSpecial: false }] }))

  const updateTag = (id: string, patch: Partial<Tag>) =>
    setDb((d) => ({ ...d, tags: d.tags.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))

  // 解散 H1：其下所有 H2 变游离（h1TagId=''），H1 本身删除
  const dissolveH1 = (tagId: string) =>
    setDb((d) => ({
      ...d,
      subTags: d.subTags.map((s) => (s.h1TagId === tagId ? { ...s, h1TagId: '' } : s)),
      tags: d.tags.filter((t) => t.id !== tagId),
    }))

  // ---------- H2 标签 ----------
  const addSubTag = (h1TagId: string, name: string, emoji: string, color: string) =>
    setDb((d) => ({
      ...d,
      subTags: [
        ...d.subTags,
        {
          id: uid(), h1TagId, name, emoji, color,
          isPinned: false, sharedWithAI: false,
          order: d.subTags.filter((s) => s.h1TagId === h1TagId).length, // 排在末尾
        },
      ],
    }))

  const updateSubTag = (id: string, patch: Partial<SubTag>) =>
    setDb((d) => ({ ...d, subTags: d.subTags.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))

  // 删除 H2：连带其下所有 Section；这些 Section 里的任务 sectionId 归 null（任务不删）
  const deleteSubTag = (id: string) =>
    setDb((d) => {
      const doomedSections = new Set(d.sections.filter((s) => s.subTagId === id).map((s) => s.id))
      return {
        ...d,
        subTags: d.subTags.filter((s) => s.id !== id),
        sections: d.sections.filter((s) => !doomedSections.has(s.id)),
        tasks: d.tasks.map((t) => (t.sectionId && doomedSections.has(t.sectionId) ? { ...t, sectionId: null } : t)),
      }
    })

  // ---------- 看板 Section（Step 4） ----------
  // 基础创建：order 缺省排到该 H2 末尾。返回新 id（调用方可据此进入重命名等后续态）
  const addSection = (subTagId: string, name: string, order?: number): string => {
    const id = uid()
    setDb((d) => {
      const siblings = d.sections.filter((s) => s.subTagId === subTagId)
      const maxOrder = siblings.length ? Math.max(...siblings.map((s) => s.order)) : -1
      const ord = order ?? maxOrder + 1
      return {
        ...d,
        sections: [
          ...d.sections.map((s) => (s.subTagId === subTagId && s.order >= ord ? { ...s, order: s.order + 1 } : s)),
          { id, subTagId, name, order: ord },
        ],
      }
    })
    return id
  }

  // 在锚点 Section 左/右插入「未命名分组」。返回新 id（原实现内部直接 set 重命名态；
  // 迁入 hook 后重命名态归 App，由调用方以返回 id 设置，行为等价）
  // 左侧：新组 order = 锚点 order，锚点及其右侧全部 +1；右侧：新组 order = 锚点 order+1，其右侧全部 +1
  const insertSectionNextTo = (anchorId: string, side: 'left' | 'right'): string => {
    const id = uid()
    setDb((d) => {
      const anchor = d.sections.find((s) => s.id === anchorId)
      if (!anchor) return d
      const insertOrder = side === 'left' ? anchor.order : anchor.order + 1
      return {
        ...d,
        sections: [
          ...d.sections.map((s) =>
            s.subTagId === anchor.subTagId && s.order >= insertOrder ? { ...s, order: s.order + 1 } : s
          ),
          { id, subTagId: anchor.subTagId, name: '未命名分组', order: insertOrder },
        ],
      }
    })
    return id
  }

  const updateSection = (id: string, patch: Partial<Section>) =>
    setDb((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))

  // 移动 Section 到其他 H2：order 排到目标 H2 的末尾（原 H2 剩余组不重排，允许跳号）
  const moveSection = (id: string, newSubTagId: string) =>
    setDb((d) => {
      const targetSecs = d.sections.filter((s) => s.subTagId === newSubTagId)
      const nextOrder = targetSecs.length ? Math.max(...targetSecs.map((s) => s.order)) + 1 : 0
      return {
        ...d,
        sections: d.sections.map((s) => (s.id === id ? { ...s, subTagId: newSubTagId, order: nextOrder } : s)),
      }
    })

  // 删除 Section 及其下所有任务（连带删除，规格明确）
  const deleteSection = (id: string) =>
    setDb((d) => ({
      ...d,
      sections: d.sections.filter((s) => s.id !== id),
      tasks: d.tasks.filter((t) => t.sectionId !== id),
    }))

  return {
    addTask, addTaskWithOptions, addSubtask, updateTask, deleteTask, deleteTaskRecursive,
    updateTaskTag, updateTaskSection, toggleTaskDone, aggregateSectionDone, addSubtaskInline,
    togglePinnedToday, setMasterTask, setTaskPriority, setTaskReminder, updateTaskDue, addTaskToSection,
    toggleChecklistItem, addChecklistItem, updateChecklistItem, deleteChecklistItem,
    addTag, updateTag, dissolveH1,
    addSubTag, updateSubTag, deleteSubTag,
    addSection, insertSectionNextTo, updateSection, moveSection, deleteSection,
  }
}
