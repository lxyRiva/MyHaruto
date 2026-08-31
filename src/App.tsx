// App = 三层结构：L1 图标导航栏 → L2 清单树（任务模块）→ L3 内容区 + 右侧详情
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Db, Task, Tag, SubTag, Section, ChecklistItem, Habit, ImportantDay } from './types'
import PomodoroBar from './components/PomodoroBar'
import FloatingMenu from './components/FloatingMenu'
import BoardView from './components/BoardView'
import { IconTasks, IconTimer, IconCalendar, IconCheck, IconChart, IconHeart, IconFilm, IconPlane, IconChat, IconTown, IconSun, IconMoon, IconClock, IconChevron, IconSettings } from './components/icons'
import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Habits from './pages/Habits'
import Stats from './pages/Stats'
import ImportantDays from './pages/ImportantDays'
import PomodoroPage from './pages/PomodoroPage'
import Placeholder from './pages/Placeholder'
import Recent7View from './components/Recent7View'
import TaskDetailPanel from './components/TaskDetailPanel'

type PageKey =
  | 'today' | 'tasks' | 'calendar' | 'habits' | 'stats' | 'focus'
  | 'important' | 'album' | 'travel' | 'chat' | 'town'

const NAV: { key: PageKey; icon: () => JSX.Element; label: string; soon?: string }[] = [
  { key: 'tasks', icon: IconTasks, label: '任务' },
  { key: 'focus', icon: IconTimer, label: '专注' },
  { key: 'calendar', icon: IconCalendar, label: '月历' },
  { key: 'habits', icon: IconCheck, label: '习惯打卡' },
  { key: 'stats', icon: IconChart, label: '数据统计' },
  { key: 'important', icon: IconHeart, label: '重要日' },
  { key: 'album', icon: IconFilm, label: '书影清单', soon: 'V2' },
  { key: 'travel', icon: IconPlane, label: '旅游札记', soon: 'V2' },
  { key: 'chat', icon: IconChat, label: 'AI 伙伴', soon: 'M5' }, // 悬浮标题动态显示 db.settings.aiName
  { key: 'town', icon: IconTown, label: '小镇', soon: 'V3' },
]

const PLACEHOLDER_PAGE: Partial<Record<PageKey, string>> = {
  album: '书影清单', travel: '旅游札记', town: '小镇', // chat 占位文案动态用 db.settings.aiName
}

const PALETTE = ['#3d7ea6', '#5b8c5a', '#c97b4a', '#8e6bb3', '#b85c5c', '#4a9e9e']

// H2 标签 18 色板（新建/编辑标签 modal 用）
const H2_PALETTE = [
  '#3d7ea6', '#5b8c5a', '#c97b4a', '#8e6bb3', '#b85c5c', '#4a9e9e',
  '#d4a017', '#e07a5f', '#6a994e', '#7a6ff0', '#f2a900', '#00a3a3',
  '#e56db1', '#5c7cfa', '#8d6e63', '#607d8b', '#c2185b', '#7cb342',
]

// H2 标签 emoji 预设（用户数据，允许 emoji；点击填入输入框，也可手动输入自定义）
const EMOJI_PRESETS = ['📝', '📞', '💻', '📊', '📚', '🎯', '🧘‍♀️', '💪', '🛒', '✈️', '🎨', '🏠']

interface Pomo {
  taskId: string
  title: string
  mode: 'countdown' | 'stopwatch'
  startedAt: number
  totalMin: number
  endAt: number // stopwatch 为 0
  remainingMs: number
  running: boolean
  swAccum: number // 正计时累计毫秒（暂停不清零）
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export default function App() {
  const [db, setDb] = useState<Db>({ tasks: [], tags: [], subTags: [], sections: [], focusSessions: [], habits: [], habitRecords: [], importantDays: [], periodRecords: [], sleepRecords: [], settings: { theme: 'light', harutoMetDate: '', currentCharacterId: 'haruto', skinId: 'default', aiName: 'Haruto' } })
  const [loaded, setLoaded] = useState(false)
  const [page, setPage] = useState<PageKey>('today')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pomoTarget, setPomoTarget] = useState<Task | null>(null)
  const [pomo, setPomo] = useState<Pomo | null>(null)
  const pomoCompletingRef = useRef(false) // 完成互斥锁（防双组件重复记录）
  // L2 清单树选中项
  const [activeListId, setActiveListId] = useState<string>('all')
  // 新建清单表单
  const [addingList, setAddingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState(PALETTE[0])

  // ----- L2 两层树（H1清单 → H2标签） -----
  const [expandedH1s, setExpandedH1s] = useState<Set<string> | null>(null) // null = 默认全部展开
  const [activeSubTagId, setActiveSubTagId] = useState<string | null>(null) // 当前选中 H2，null = H1 总览/固定入口
  // H1 三点菜单 / H2 右键菜单 / H1 行内重命名 / H2 新建编辑 modal / 解散确认
  const [h1Menu, setH1Menu] = useState<{ tagId: string; x: number; y: number } | null>(null)
  const [subTagMenu, setSubTagMenu] = useState<{ subTagId: string; x: number; y: number } | null>(null)
  const [renamingH1, setRenamingH1] = useState<string | null>(null)
  const [subTagModal, setSubTagModal] = useState<{ mode: 'create' | 'edit'; h1TagId: string; subTag?: SubTag } | null>(null)
  const [dissolveConfirm, setDissolveConfirm] = useState<{ tagId: string } | null>(null)
  // 当前正在重命名的看板 Section（Step 4：左/右插入分组后立即进入重命名）
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null)

  // 设置弹窗（当前仅 AI 名字）
  const [showSettings, setShowSettings] = useState(false)
  const [aiNameDraft, setAiNameDraft] = useState('')

  // 修正1：右栏宽度可拖拽调整（localStorage 持久化，260-480px）
  const [detailWidth, setDetailWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem('mh-detail-panel-width'))
    return Number.isFinite(v) && v >= 260 && v <= 480 ? v : 320
  })
  const detailDragRef = useRef<{ startX: number; startW: number } | null>(null)
  const startDetailResize = (clientX: number) => {
    detailDragRef.current = { startX: clientX, startW: detailWidth }
    const onMove = (ev: MouseEvent) => {
      if (!detailDragRef.current) return
      const w = Math.max(260, Math.min(480, detailDragRef.current.startW - (ev.clientX - detailDragRef.current.startX)))
      setDetailWidth(w)
      localStorage.setItem('mh-detail-panel-width', String(w))
    }
    const onUp = () => {
      detailDragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // 修正3：L2 的 H1/H2 拖拽排序（置顶项固定最前不参与）
  const [l2Drag, setL2Drag] = useState<{ kind: 'h1' | 'h2'; id: string } | null>(null)
  const [l2Over, setL2Over] = useState<{ kind: 'h1' | 'h2'; id: string; pos: 'before' | 'after' } | null>(null)
  const moveH1 = (dragId: string, targetId: string, pos: 'before' | 'after') =>
    setDb((d) => {
      const arr = [...d.tags]
      if (!arr.some((t) => t.id === dragId) || dragId === targetId) return d
      const from = arr.findIndex((t) => t.id === dragId)
      const [item] = arr.splice(from, 1)
      const toIdx = arr.findIndex((t) => t.id === targetId)
      arr.splice(pos === 'before' ? toIdx : toIdx + 1, 0, item)
      return { ...d, tags: arr }
    })
  const moveSubTag = (dragId: string, targetId: string, pos: 'before' | 'after') =>
    setDb((d) => {
      const drag = d.subTags.find((s) => s.id === dragId)
      const target = d.subTags.find((s) => s.id === targetId)
      if (!drag || !target || drag.h1TagId !== target.h1TagId || drag.isPinned || target.isPinned) return d
      const group = d.subTags.filter((s) => s.h1TagId === drag.h1TagId && !s.isPinned).sort((a, b) => a.order - b.order)
      const from = group.findIndex((s) => s.id === dragId)
      if (from < 0 || !group.some((s) => s.id === targetId) || dragId === targetId) return d
      const [item] = group.splice(from, 1)
      const toIdx = group.findIndex((s) => s.id === targetId)
      group.splice(pos === 'before' ? toIdx : toIdx + 1, 0, item)
      const orderMap = new Map(group.map((s, i) => [s.id, i]))
      return { ...d, subTags: d.subTags.map((s) => (orderMap.has(s.id) ? { ...s, order: orderMap.get(s.id)! } : s)) }
    })

  // 修正4：点击 H2 归属跳转该标签的看板视图
  const openSubTagBoard = (subTagId: string) => {
    const st = db.subTags.find((s) => s.id === subTagId)
    setActiveSubTagId(subTagId)
    setActiveListId(st?.h1TagId || 'all')
    setPage('tasks')
    setSelectedId(null)
  }

  useEffect(() => {
    window.myharuto.getDb().then((d) => {
      setDb(d)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (loaded) window.myharuto.saveDb(db)
  }, [db, loaded])

  // 【视觉签名】主题切换颜色过渡依赖 styles.css 的 * transition 规则，不要移除
  useEffect(() => {
    document.documentElement.classList.toggle('dark', db.settings.theme === 'dark')
  }, [db.settings.theme])

  const toggleTheme = () =>
    setDb((d) => ({ ...d, settings: { ...d.settings, theme: d.settings.theme === 'dark' ? 'light' : 'dark' } }))

  // 保存设置弹窗（写入后由 db useEffect 自动持久化；aiName 全局显示处实时生效）
  const saveSettings = () => {
    const v = aiNameDraft.trim()
    if (!v) return
    setDb((d) => ({ ...d, settings: { ...d.settings, aiName: v } }))
    setShowSettings(false)
  }

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

  const toggleH1Expand = (tagId: string) =>
    setExpandedH1s((prev) => {
      const cur = prev ?? new Set(db.tags.map((t) => t.id)) // 首次操作时物化"全展开"
      const next = new Set(cur)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })

  const selectSubTag = (subTagId: string) => {
    const st = db.subTags.find((s) => s.id === subTagId)
    setActiveSubTagId(subTagId)
    // 同步归属 H1：否则从最近7天进看板会被 L3 的 recent7 分支拦截（点击无反应），从今天进会泄漏旧右栏
    setActiveListId(st?.h1TagId || 'all')
    setSelectedId(null) // 看板无右栏，切入时自动收起
    setPage('tasks')
  }

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
  // 基础创建：order 缺省排到该 H2 末尾
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

  // 在锚点 Section 左/右插入「未命名分组」并立即进入重命名
  // 左侧：新组 order = 锚点 order，锚点及其右侧全部 +1；右侧：新组 order = 锚点 order+1，其右侧全部 +1
  const insertSectionNextTo = (anchorId: string, side: 'left' | 'right') => {
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
    setRenamingSectionId(id)
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

  // ---------- 看板任务卡片（Step 5） ----------
  // 勾选完成只变灰原位不动；取消完成时清掉聚合标记（下次完成从原位开始，聚合是显式动作）
  const toggleTaskDone = (id: string) =>
    setDb((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === id ? { ...t, done: !t.done, ...(t.done ? { aggregated: false } : {}) } : t
      ),
    }))

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
  const togglePinnedToday = (id: string) =>
    setDb((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, isPinnedToday: !t.isPinnedToday } : t)) }))
  // 关联主任务（任务2）：时长归并由 Stats.rootTaskIdOf 沿 parentTaskId+masterTaskId 链处理
  const setMasterTask = (id: string, masterTaskId: string | null) => updateTask(id, { masterTaskId })
  const setTaskPriority = (id: string, priority: NonNullable<Task['priority']>) => updateTask(id, { priority })
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

  // 任务级提醒（日期选择器「让 ta 提醒」）：remindAt = 提醒时刻 ISO，remindDaysBefore = 提前天数（0=当天）
  const setTaskReminder = (id: string, remindAt: string | null, remindDaysBefore: number | null) =>
    updateTask(id, { remindAt, remindDaysBefore })
  const updateTaskDue = (id: string, dueDate: string | null) => updateTask(id, { dueDate })

  // ---------- 习惯 ----------
  const addHabit = (name: string, icon: string) =>
    setDb((d) => ({ ...d, habits: [...d.habits, { id: uid(), name, icon, monthlyTarget: 20, createdAt: new Date().toISOString() }] }))

  const updateHabit = (id: string, patch: Partial<Pick<Habit, 'name' | 'icon' | 'monthlyTarget'>>) =>
    setDb((d) => ({ ...d, habits: d.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) }))

  const deleteHabit = (id: string) =>
    setDb((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id), habitRecords: d.habitRecords.filter((r) => r.habitId !== id) }))

  const toggleHabitCheck = (habitId: string, date: string) =>
    setDb((d) => {
      const exists = d.habitRecords.some((r) => r.habitId === habitId && r.date === date)
      return {
        ...d,
        habitRecords: exists
          ? d.habitRecords.filter((r) => !(r.habitId === habitId && r.date === date))
          : [...d.habitRecords, { id: uid(), habitId, date }],
      }
    })

  // ---------- 重要日 & 生理期 ----------
  const addImportantDay = (day: Omit<ImportantDay, 'id'>) =>
    setDb((d) => ({ ...d, importantDays: [...d.importantDays, { id: uid(), ...day }] }))

  const updateImportantDay = (id: string, patch: Partial<ImportantDay>) =>
    setDb((d) => ({ ...d, importantDays: d.importantDays.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))

  const deleteImportantDay = (id: string) =>
    setDb((d) => ({ ...d, importantDays: d.importantDays.filter((x) => x.id !== id) }))

  const markPeriod = (date: string, kind: 'start' | 'end') =>
    setDb((d) => {
      if (kind === 'start')
        return { ...d, periodRecords: [...d.periodRecords, { id: uid(), startDate: date, endDate: null }] }
      return {
        ...d,
        periodRecords: d.periodRecords.map((r) => (!r.endDate && r.startDate < date ? { ...r, endDate: date } : r)),
      }
    })

  const deletePeriod = (startDate: string) =>
    setDb((d) => ({ ...d, periodRecords: d.periodRecords.filter((p) => p.startDate !== startDate) }))

  // 恢复一条已结束的经期记录为进行中（endDate 置 null；生理期右键「恢复」用）
  const reopenPeriod = (startDate: string) =>
    setDb((d) => ({
      ...d,
      periodRecords: d.periodRecords.map((p) => (p.startDate === startDate ? { ...p, endDate: null } : p)),
    }))

  // ---------- 番茄钟 ----------
  const startPomo = (minutes: number, mode: 'countdown' | 'stopwatch' = 'countdown') => {
    if (!pomoTarget) return
    setPomo({
      taskId: pomoTarget.id, title: pomoTarget.title, mode, startedAt: Date.now(),
      totalMin: minutes, endAt: mode === 'countdown' ? Date.now() + minutes * 60000 : 0,
      remainingMs: mode === 'countdown' ? minutes * 60000 : 0, running: true, swAccum: 0,
    })
  }

  const togglePomo = () =>
    setPomo((p) => {
      if (!p) return p
      if (p.running) {
        // 暂停：记下剩余/累计
        return {
          ...p,
          running: false,
          remainingMs: p.mode === 'countdown' ? Math.max(0, p.endAt - Date.now()) : 0,
          swAccum: p.mode === 'stopwatch' ? p.swAccum + (Date.now() - p.startedAt) : 0,
        }
      }
      // 继续：从暂停点接续（正计时 startedAt 重置为现在，累计增量进 swAccum，避免双倍计数）
      return {
        ...p,
        running: true,
        endAt: p.mode === 'countdown' ? Date.now() + p.remainingMs : 0,
        startedAt: Date.now(),
      }
    })

  const completePomo = () => {
    // 互斥锁：浮动条和专注页都可能触发"到点完成"，确保只记一次
    if (pomoCompletingRef.current || !pomo) return
    pomoCompletingRef.current = true
    const minutes = Math.max(1, Math.round((Date.now() - pomo.startedAt) / 60000))
    setDb((d) => ({
      ...d,
      focusSessions: [
        { id: uid(), taskId: pomo.taskId, startedAt: new Date(pomo.startedAt).toISOString(), minutes },
        ...d.focusSessions,
      ],
    }))
    setPomo(null)
    setTimeout(() => { pomoCompletingRef.current = false }, 50)
  }

  // ---------- 派生 ----------
  // AI 显示名兜底：旧库（主进程未重启自愈时）可能还没有 aiName 字段
  const aiName = db.settings.aiName || 'Haruto'
  const selected = db.tasks.find((t) => t.id === selectedId) ?? null
  const selectedChildren = selected ? db.tasks.filter((t) => t.parentTaskId === selected.id) : []
  const tagMap = new Map(db.tags.map((t) => [t.id, t]))
  // 本地日期（不能用 toISOString：那是 UTC 日期，北京时间 0-8 点会比本地早一天，
  // 曾导致"今日到期任务进不了专注池"的时区 bug）
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  // 专注记录的 startedAt 是 ISO(UTC)，也换算到本地日期再比对
  const localDateOf = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const todaySessions = db.focusSessions.filter((s) => localDateOf(s.startedAt) === todayStr)
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0)
  const mainTasks = db.tasks.filter((t) => !t.parentTaskId)
  const specialTags = db.tags.filter((t) => t.isSpecial)
  const normalTags = db.tags.filter((t) => !t.isSpecial)
  const countOf = (id: string) =>
    id === 'all' ? mainTasks.filter((t) => !t.done).length
    : id === 'today' ? mainTasks.filter((t) => !t.done && (t.dueDate === todayStr || t.isPinnedToday)).length
    : mainTasks.filter((t) => t.tagId === id && !t.done).length

  const taskProps = {
    tasks: db.tasks,
    tags: db.tags,
    subTags: db.subTags,
    sections: db.sections,
    onDeleteTaskRecursive: deleteTaskRecursive,
    onAdd: addTask,
    onAddSub: addSubtask,
    onUpdate: updateTask,
    onDelete: deleteTask,
    onPomodoro: (t: Task) => setPomoTarget(t),
    selectedId,
    onSelect: (id: string | null) => setSelectedId(id),
  }

  // 看板共享 props（视图A/B 共用，Step 4 分组操作 + 新建任务）
  const boardProps = {
    subTags: db.subTags,
    sections: db.sections,
    tasks: db.tasks,
    onSetMasterTask: setMasterTask,
    focusSessions: db.focusSessions,
    tags: db.tags,
    renamingSectionId,
    onRequestRename: (id: string) => setRenamingSectionId(id),
    onRenameCommit: (id: string, name: string) => {
      if (name) updateSection(id, { name })
      setRenamingSectionId(null)
    },
    onRenameCancel: () => setRenamingSectionId(null),
    onAddTaskToSection: addTaskToSection,
    onInsertSection: insertSectionNextTo,
    onMoveSection: moveSection,
    onDeleteSection: deleteSection,
    onCreateSection: (subTagId: string) => setRenamingSectionId(addSection(subTagId, '未命名分组')),
    onAggregateDone: aggregateSectionDone,
    // Step 5 任务卡片交互
    aiName,
    onToggleDone: toggleTaskDone,
    onToggleChecklist: toggleChecklistItem,
    onAddChecklistItem: addChecklistItem,
    onUpdateChecklistItem: updateChecklistItem,
    onDeleteChecklistItem: deleteChecklistItem,
    onSetTaskReminder: setTaskReminder,
    onUpdateTaskDue: updateTaskDue,
    onAddSubtask: addSubtaskInline,
    onUpdateTag: updateTaskTag,
    onUpdateTaskSection: updateTaskSection,
    onTogglePinned: togglePinnedToday,
    onSetPriority: setTaskPriority,
    onPomodoro: (t: Task) => setPomoTarget(t),
    onDeleteTaskRecursive: deleteTaskRecursive,
    onOpenSubTag: openSubTagBoard,
  }

  // 今日/最近7天列表视图共享 props（Step 6）
  const minutesOf = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of db.focusSessions) m.set(s.taskId, (m.get(s.taskId) ?? 0) + s.minutes)
    return (id: string) => m.get(id) ?? 0
  }, [db.focusSessions])
  const listViewProps = {
    tasks: db.tasks,
    tags: db.tags,
    subTags: db.subTags,
    sections: db.sections,
    focusSessions: db.focusSessions,
    aiName,
    selectedId,
    onSelect: (id: string | null) => setSelectedId(id),
    minutesOf,
    onOpenSubTag: openSubTagBoard,
    onAddTaskWithOptions: addTaskWithOptions,
    onToggleDone: toggleTaskDone,
    onToggleChecklist: toggleChecklistItem,
    onAddChecklistItem: addChecklistItem,
    onUpdateChecklistItem: updateChecklistItem,
    onDeleteChecklistItem: deleteChecklistItem,
    onSetTaskReminder: setTaskReminder,
    onUpdateTaskDue: updateTaskDue,
    onAddSubtask: addSubtaskInline,
    onUpdateTag: updateTaskTag,
    onUpdateTaskSection: updateTaskSection,
    onTogglePinned: togglePinnedToday,
    onSetPriority: setTaskPriority,
    onSetMasterTask: setMasterTask,
    onPomodoro: (t: Task) => setPomoTarget(t),
    onDeleteTaskRecursive: deleteTaskRecursive,
    onUpdateTask: updateTask,
  }

  // 专注页任务池：符合条件的主任务 + 它们的全部子任务（子任务可独立计时，问题2）
  const focusMainIds = new Set(
    mainTasks.filter((t) => !t.done && (!t.dueDate || t.dueDate <= todayStr)).map((t) => t.id)
  )
  const focusPool = db.tasks.filter(
    (t) => !t.done && (focusMainIds.has(t.id) || (t.parentTaskId && focusMainIds.has(t.parentTaskId)))
  )

  // L2 两层树渲染：H1 行（三角+色点+名称+计数+三点）/ H2 行（缩进22px+emoji+名称）
  const sortedSubTagsOf = (h1TagId: string) =>
    db.subTags
      .filter((s) => s.h1TagId === h1TagId)
      .sort((a, b) => (a.isPinned === b.isPinned ? a.order - b.order : a.isPinned ? -1 : 1))

  // H2 行（无左内边距：由外层缩进容器统一提供 28px + 竖线）；色点在行最右（修正6：H2 持有颜色标识，H1 不再显示色点）
  const renderSubTagRow = (st: SubTag) => {
    const dragOverH2 = l2Over?.kind === 'h2' && l2Over.id === st.id
    return (
    <button
      key={st.id}
      onDragOver={(e) => {
        if (!l2Drag || l2Drag.kind !== 'h2' || l2Drag.id === st.id || st.isPinned) return
        e.preventDefault()
        const r = e.currentTarget.getBoundingClientRect()
        setL2Over({ kind: 'h2', id: st.id, pos: e.clientY < r.top + r.height / 2 ? 'before' : 'after' })
      }}
      onDrop={(e) => {
        e.preventDefault()
        if (l2Drag && l2Over?.id === st.id) moveSubTag(l2Drag.id, st.id, l2Over.pos)
        setL2Drag(null)
        setL2Over(null)
      }}
      onClick={() => selectSubTag(st.id)}
      onContextMenu={(e) => {
        e.preventDefault()
        setSubTagMenu({ subTagId: st.id, x: e.clientX, y: e.clientY })
      }}
      className={`group/sub w-full flex items-center gap-1.5 pr-2 py-1.5 rounded-lg text-[13px] transition-[border-color]
        ${activeSubTagId === st.id && page === 'tasks'
          ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
          : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}
        ${dragOverH2 ? (l2Over!.pos === 'before' ? 'border-t-2 border-t-haruto-sea' : 'border-b-2 border-b-haruto-sea') : ''}
        ${l2Drag?.kind === 'h2' && l2Drag.id === st.id ? 'opacity-50' : ''}`}
    >
      {/* Bug2 修复：拖拽把手模式——只有把手 draggable，行内 click 不再被拖拽吞掉 */}
      {!st.isPinned && (
        <span
          draggable
          onDragStart={(e) => {
            setL2Drag({ kind: 'h2', id: st.id })
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragEnd={() => {
            setL2Drag(null)
            setL2Over(null)
          }}
          onClick={(e) => e.stopPropagation()}
          title="拖动排序"
          className="cursor-grab shrink-0 w-2 text-center text-neutral-300 opacity-0 group-hover/sub:opacity-100 transition-opacity select-none"
        >
          ⠿
        </span>
      )}
      {st.emoji && <span className="text-xs shrink-0">{st.emoji}</span>}
      <span className="truncate">{st.name}</span>
      <span className="ml-auto mr-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: st.color }} />
    </button>
    )
  }

  // H2 列表容器：缩进 28px（13px 外距 + 15px 内距），浅色竖线分隔视觉层级
  const subTagIndentCls =
    'ml-[13px] pl-[15px] border-l border-neutral-200/70 dark:border-neutral-700/60 space-y-0.5'

  const renderH1 = (t: Tag) => {
    const expanded = expandedH1s === null || expandedH1s.has(t.id)
    const isActive = activeListId === t.id && page === 'tasks' && !activeSubTagId
    const subs = sortedSubTagsOf(t.id)
    return (
      <div key={t.id}>
        {renamingH1 === t.id ? (
          <input
            autoFocus
            defaultValue={t.name}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => setRenamingH1(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                updateTag(t.id, { name: e.currentTarget.value.trim() })
                setRenamingH1(null)
              }
              if (e.key === 'Escape') setRenamingH1(null)
            }}
            className="w-full text-sm rounded-lg border border-haruto-sea
              bg-white dark:bg-neutral-900 px-2 py-1.5 outline-none"
          />
        ) : (
          <div
            onDragOver={(e) => {
              if (!l2Drag || l2Drag.kind !== 'h1' || l2Drag.id === t.id || t.isPinned) return
              e.preventDefault()
              const r = e.currentTarget.getBoundingClientRect()
              setL2Over({ kind: 'h1', id: t.id, pos: e.clientY < r.top + r.height / 2 ? 'before' : 'after' })
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (l2Drag && l2Over?.id === t.id) moveH1(l2Drag.id, t.id, l2Over.pos)
              setL2Drag(null)
              setL2Over(null)
            }}
            onClick={() => {
              toggleH1Expand(t.id)
              setActiveListId(t.id)
              setActiveSubTagId(null)
              setSelectedId(null) // 看板无右栏，切入时自动收起
              setPage('tasks')
            }}
            className={`group/h1 w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer select-none transition-[border-color]
              ${isActive
                ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}
              ${l2Over?.kind === 'h1' && l2Over.id === t.id ? (l2Over.pos === 'before' ? 'border-t-2 border-t-haruto-sea' : 'border-b-2 border-b-haruto-sea') : ''}
              ${l2Drag?.kind === 'h1' && l2Drag.id === t.id ? 'opacity-50' : ''}`}
          >
            {/* Bug2 修复：拖拽把手模式（置顶项无把手） */}
            {!t.isPinned && (
              <span
                draggable
                onDragStart={(e) => {
                  setL2Drag({ kind: 'h1', id: t.id })
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => {
                  setL2Drag(null)
                  setL2Over(null)
                }}
                onClick={(e) => e.stopPropagation()}
                title="拖动排序"
                className="cursor-grab shrink-0 text-neutral-300 opacity-0 group-hover/h1:opacity-100 hover:text-neutral-500 transition-opacity select-none"
              >
                ⠿
              </span>
            )}
            <span className="shrink-0 text-neutral-400"><IconChevron open={expanded} /></span>
            <span className="truncate flex-1">{t.name}</span>
            {/* H2 标签数量（无 H2 时不显示，避免无意义的 0） */}
            {subs.length > 0 && (
              <span className="text-[10px] text-neutral-400 tabular-nums">{subs.length}</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setH1Menu({ tagId: t.id, x: e.clientX, y: e.clientY })
              }}
              title="清单操作"
              className="px-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 leading-none"
            >
              ⋯
            </button>
          </div>
        )}
        {expanded && <div className={subTagIndentCls}>{subs.map(renderSubTagRow)}</div>}
      </div>
    )
  }

  // 置顶的 H1 排前面（组内其余保持原顺序）
  const byPinned = (a: Tag, b: Tag) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
  const ungroupedSubTags = sortedSubTagsOf('')

  return (
    <div className="flex h-full">
      {/* ===== L1：图标导航栏（线性图标，问题2） ===== */}
      <aside className="w-14 shrink-0 flex flex-col items-center border-r border-neutral-200 dark:border-neutral-800 bg-[#f5f5f4] dark:bg-[#121212] py-3 gap-1">
        <div className="mb-2 text-haruto-sea" title="MyHaruto">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />
          </svg>
        </div>
        {NAV.map((n) => {
          const active = page === n.key
          const disabled = !!n.soon
          const Icon = n.icon
          return (
            <button
              key={n.key}
              onClick={() => !disabled && setPage(n.key)}
              disabled={disabled}
              title={n.key === 'chat' ? aiName : n.label}
              className={`w-10 h-10 grid place-items-center rounded-xl transition-all
                ${active
                  ? 'bg-haruto-sea/15 text-haruto-sea'
                  : disabled
                    ? 'text-neutral-300 dark:text-neutral-700 cursor-default'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/10'}`}
            >
              <Icon />
            </button>
          )
        })}
        <div className="flex-1" />
        <button
          onClick={() => { setAiNameDraft(aiName); setShowSettings(true) }}
          title="设置"
          className="w-10 h-10 grid place-items-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <IconSettings />
        </button>
        <button
          onClick={toggleTheme}
          title={db.settings.theme === 'dark' ? '切换日间模式' : '切换夜间模式'}
          className="w-10 h-10 grid place-items-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/10"
        >
          {db.settings.theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </aside>

      {/* ===== L2：清单树（任务模块+今天页共用，问题1：今天收进清单树顶部） ===== */}
      {(page === 'tasks' || page === 'today') && (
        <aside className="w-52 shrink-0 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-[#fafaf9] dark:bg-[#181818] py-4">
          <div className="px-3 text-xs font-bold text-neutral-400 tracking-widest mb-2">清单</div>
          <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {/* 固定入口：今天 / 最近7天 / 全部 */}
            <button
              onClick={() => { setPage('today'); setActiveListId('today'); setActiveSubTagId(null) }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                ${page === 'today'
                  ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <IconSun />
              <span>今天</span>
              <span className="ml-auto text-[10px] text-neutral-400 tabular-nums">{countOf('today')}</span>
            </button>
            <button
              onClick={() => { setActiveListId('recent7'); setActiveSubTagId(null); setPage('tasks') }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                ${activeListId === 'recent7' && page === 'tasks' && !activeSubTagId
                  ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <IconClock />
              <span>最近7天</span>
            </button>
            <button
              onClick={() => { setActiveListId('all'); setActiveSubTagId(null); setPage('tasks') }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                ${activeListId === 'all' && page === 'tasks' && !activeSubTagId
                  ? 'bg-haruto-sea/15 text-haruto-sea font-medium'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <IconTasks />
              <span>全部</span>
              <span className="ml-auto text-[10px] text-neutral-400 tabular-nums">{countOf('all')}</span>
            </button>
            {specialTags.length > 0 && (
              <div className="pt-2 pb-0.5 px-3 text-[10px] font-medium text-neutral-400 tracking-wide">我的愿景</div>
            )}
            {[...specialTags].sort(byPinned).map(renderH1)}
            <div className="pt-2 pb-0.5 px-3 text-[10px] font-medium text-neutral-400 tracking-wide">清单</div>
            {[...normalTags].sort(byPinned).map(renderH1)}
            {ungroupedSubTags.length > 0 && (
              <>
                <div className="pt-2 pb-0.5 px-3 text-[10px] font-medium text-neutral-400 tracking-wide">未分组</div>
                <div className={subTagIndentCls}>{ungroupedSubTags.map(renderSubTagRow)}</div>
              </>
            )}
            {addingList ? (
              <div className="px-1 pt-1">
                <input
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newListName.trim()) {
                      addTag(newListName.trim(), newListColor)
                      setNewListName(''); setAddingList(false)
                    }
                    if (e.key === 'Escape') setAddingList(false)
                  }}
                  placeholder="清单名，回车创建"
                  className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-600
                    bg-white dark:bg-neutral-900 px-2 py-1.5 outline-none focus:border-haruto-sea"
                />
                <div className="flex gap-1 mt-1.5 px-1">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewListColor(c)}
                      className={`w-3.5 h-3.5 rounded-full ${newListColor === c ? 'ring-2 ring-offset-1 ring-neutral-400' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingList(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 mt-1 rounded-lg text-xs text-neutral-400 hover:text-haruto-sea transition-colors"
              >
                ＋ 新建清单
              </button>
            )}
          </nav>
          <div className="mx-2 mt-2 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2 text-[10px] text-neutral-500">
            今日专注 <b className="text-haruto-sea">{todayMinutes}</b> 分钟 · 🍅{todaySessions.length}
          </div>
        </aside>
      )}

      {/* ===== L3：内容区 ===== */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {!loaded ? (
          <div className="h-full grid place-items-center text-neutral-400">加载中…</div>
        ) : page === 'today' ? (
          <Today {...listViewProps} />
        ) : page === 'tasks' ? (
          activeListId === 'recent7' ? (
            <Recent7View {...listViewProps} />
          ) : activeSubTagId ? (
            // 视图B：H2 单标签看板（无右栏）
            <BoardView
              {...boardProps}
              h1TagId={db.subTags.find((s) => s.id === activeSubTagId)?.h1TagId ?? null}
              activeSubTagId={activeSubTagId}
            />
          ) : activeListId !== 'all' && activeListId !== 'today' && tagMap.has(activeListId) ? (
            // 视图A：H1 总览看板（该 H1 下所有 H2 平铺，无右栏）；'all'/'today' 保留原任务列表
            <BoardView {...boardProps} h1TagId={activeListId} activeSubTagId={null} />
          ) : (
            <Tasks {...taskProps} activeListId={activeListId} />
          )
        ) : page === 'focus' ? (
          <PomodoroPage
            tasks={focusPool}
            selectedTaskId={pomoTarget?.id ?? null}
            onSelectTask={(id) => setPomoTarget(db.tasks.find((t) => t.id === id) ?? null)}
            pomo={pomo}
            onStart={startPomo}
            onToggle={togglePomo}
            onAbandon={() => { setPomo(null); setPomoTarget(null) }}
            onComplete={completePomo}
            todaySessions={todaySessions}
            titleOf={(id) => db.tasks.find((t) => t.id === id)?.title ?? '未知任务'}
          />
        ) : page === 'calendar' ? (
          <Calendar
            tasks={db.tasks}
            tags={db.tags}
            subTags={db.subTags}
            sections={db.sections}
            onToggleTask={(id, done) => updateTask(id, { done })}
            onAddTask={(title, date) => addTask(title, date, null)}
          />
        ) : page === 'habits' ? (
          <Habits
            habits={db.habits}
            habitRecords={db.habitRecords}
            onAddHabit={addHabit}
            onUpdateHabit={updateHabit}
            onDeleteHabit={deleteHabit}
            onToggleCheck={toggleHabitCheck}
          />
        ) : page === 'stats' ? (
          <Stats focusSessions={db.focusSessions} sleepRecords={db.sleepRecords} tasks={db.tasks} tags={db.tags} />
        ) : page === 'important' ? (
          <ImportantDays
            importantDays={db.importantDays}
            periodRecords={db.periodRecords}
            aiName={aiName}
            onAddDay={addImportantDay}
            onUpdateDay={updateImportantDay}
            onDeleteDay={deleteImportantDay}
            onPeriodMark={markPeriod}
            onDeletePeriod={deletePeriod}
            onPeriodReopen={reopenPeriod}
          />
        ) : (
          <Placeholder label={page === 'chat' ? `${aiName} 聊天` : PLACEHOLDER_PAGE[page] ?? ''} />
        )}
      </main>

      {/* ===== 右栏 A：任务详情面板（今日页 / 最近7天；文本可编辑+检查事项+AI留言区，Step 6） ===== */}
      {selected && (page === 'today' || (page === 'tasks' && activeListId === 'recent7')) && (
        <div
          onMouseDown={(e) => startDetailResize(e.clientX)}
          title="拖动调整宽度"
          className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-haruto-sea/30"
        />
      )}
      {selected && (page === 'today' || (page === 'tasks' && activeListId === 'recent7')) && (
        <aside
          style={{ width: detailWidth }}
          className="shrink-0 overflow-hidden border-l border-neutral-200 p-5 dark:border-neutral-800"
        >
          <div className="flex h-full flex-col">
            <button
              onClick={() => setSelectedId(null)}
              className="mb-1 self-end text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              title="收起"
            >
              ×
            </button>
            <TaskDetailPanel
              task={selected}
              aiName={aiName}
              subTags={db.subTags}
              sections={db.sections}
              onOpenSubTag={openSubTagBoard}
              onUpdateTask={updateTask}
              onToggleChecklist={toggleChecklistItem}
              onAddChecklistItem={addChecklistItem}
              onUpdateChecklistItem={updateChecklistItem}
              onDeleteChecklistItem={deleteChecklistItem}
            />
          </div>
        </aside>
      )}

      {/* ===== 右栏 B：旧版详情（任务的 all·today 列表选中时；看板视图不渲染） ===== */}
      {selected && page === 'tasks' && (activeListId === 'all' || activeListId === 'today') && (
        <aside className="w-[320px] shrink-0 border-l border-neutral-200 dark:border-neutral-800 p-5 overflow-y-auto">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold text-[15px] leading-snug break-all">
              {selected.done ? '✅ ' : ''}{selected.title}
            </h2>
            <button
              onClick={() => setSelectedId(null)}
              className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
              title="收起"
            >
              ×
            </button>
          </div>
          {selected.tagId && tagMap.get(selected.tagId) && (
            <span
              className="inline-flex items-center gap-1.5 mt-2 text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: (tagMap.get(selected.tagId) as Tag).color + '22', color: (tagMap.get(selected.tagId) as Tag).color }}
            >
              ● {(tagMap.get(selected.tagId) as Tag).name}
            </span>
          )}
          <p className="mt-1 text-xs text-neutral-400">
            {selected.dueDate ? `📅 ${selected.dueDate}` : '无日期'} · 创建于 {selected.createdAt.slice(0, 10)}
          </p>

          {/* 子任务（每条可单独开番茄钟，问题2） */}
          <div className="mt-5">
            <div className="flex justify-between text-xs font-medium text-neutral-500 mb-1.5">
              <span>子任务</span>
              {selectedChildren.length > 0 && (
                <span>{selectedChildren.filter((c) => c.done).length}/{selectedChildren.length}</span>
              )}
            </div>
            {selectedChildren.map((c) => (
              <div key={c.id} className="group flex items-center gap-2.5 py-1.5">
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={(e) => updateTask(c.id, { done: e.target.checked })}
                  className="accent-haruto-sea w-3.5 h-3.5 shrink-0"
                />
                <span className={`flex-1 text-sm truncate ${c.done ? 'line-through text-neutral-400' : ''}`}>{c.title}</span>
                <button
                  onClick={() => setPomoTarget(c)}
                  className="text-xs opacity-40 hover:opacity-100 transition-opacity shrink-0"
                  title="子任务单独专注"
                >
                  🍅
                </button>
              </div>
            ))}
            <input
              placeholder="+ 添加子任务，回车保存"
              className="mt-1 w-full text-sm rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700
                bg-transparent px-3 py-2 outline-none focus:border-haruto-sea"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  addSubtask(selected.id, e.currentTarget.value.trim())
                  e.currentTarget.value = ''
                }
              }}
            />
          </div>

          <div className="mt-5">
            <div className="text-xs font-medium text-neutral-500 mb-1.5">描述</div>
            <textarea
              value={selected.description}
              onChange={(e) => updateTask(selected.id, { description: e.target.value })}
              placeholder="写任务描述…"
              className="w-full h-24 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700
                bg-white dark:bg-neutral-900 p-3 outline-none focus:border-haruto-sea resize-none"
            />
          </div>

          {/* AI 留言区（M6 上线后他每天会来读任务、挑 2-3 条在这里留言） */}
          <div className="mt-5">
            <div className="text-xs font-medium text-neutral-500 mb-1.5">💬 {aiName} 的留言</div>
            <div className="rounded-lg border border-dashed border-haruto-sea/30 p-3 text-sm italic text-haruto-sea/60">
              "……"（他每天会来读你的任务，挑 2-3 条在这里留言）
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setPomoTarget(selected)}
              className="text-xs px-3 py-1.5 rounded-lg bg-haruto-sea text-white"
            >
              🍅 开始专注
            </button>
            <button
              onClick={() => { deleteTask(selected.id); setSelectedId(null) }}
              className="text-xs text-red-400 hover:text-red-500"
            >
              🗑 删除任务
            </button>
          </div>
        </aside>
      )}

      {/* ===== L2 菜单与弹窗 ===== */}
      {h1Menu && (() => {
        const t = db.tags.find((x) => x.id === h1Menu.tagId)
        if (!t) return null
        return (
          <FloatingMenu
            x={h1Menu.x}
            y={h1Menu.y}
            onClose={() => setH1Menu(null)}
            entries={[
              { label: '重命名', onClick: () => setRenamingH1(t.id) },
              { label: '新建标签', onClick: () => setSubTagModal({ mode: 'create', h1TagId: t.id }) },
              { label: t.isPinned ? '取消置顶' : '置顶', onClick: () => updateTag(t.id, { isPinned: !t.isPinned }) },
              { label: '解散', danger: true, onClick: () => setDissolveConfirm({ tagId: t.id }) },
            ]}
          />
        )
      })()}

      {subTagMenu && (() => {
        const st = db.subTags.find((x) => x.id === subTagMenu.subTagId)
        if (!st) return null
        return (
          <FloatingMenu
            x={subTagMenu.x}
            y={subTagMenu.y}
            onClose={() => setSubTagMenu(null)}
            entries={[
              { label: '编辑', onClick: () => setSubTagModal({ mode: 'edit', h1TagId: st.h1TagId, subTag: st }) },
              { label: st.isPinned ? '取消置顶' : '置顶', onClick: () => updateSubTag(st.id, { isPinned: !st.isPinned }) },
              { label: st.sharedWithAI ? '取消共享给AI' : '共享给AI', onClick: () => updateSubTag(st.id, { sharedWithAI: !st.sharedWithAI }) },
              { label: '删除', danger: true, onClick: () => deleteSubTag(st.id) },
            ]}
          />
        )
      })()}

      {subTagModal && (
        <SubTagModal
          title={subTagModal.mode === 'edit' ? '编辑标签' : '新建标签'}
          initial={
            subTagModal.mode === 'edit' && subTagModal.subTag
              ? { emoji: subTagModal.subTag.emoji, name: subTagModal.subTag.name, color: subTagModal.subTag.color }
              : { emoji: '', name: '', color: H2_PALETTE[0] }
          }
          onCancel={() => setSubTagModal(null)}
          onSave={(v) => {
            if (subTagModal.mode === 'create') addSubTag(subTagModal.h1TagId, v.name, v.emoji, v.color)
            else if (subTagModal.subTag) updateSubTag(subTagModal.subTag.id, v)
            setSubTagModal(null)
          }}
        />
      )}

      {dissolveConfirm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/30"
          onMouseDown={(e) => e.target === e.currentTarget && setDissolveConfirm(null)}
        >
          <div className="w-72 rounded-xl bg-white dark:bg-neutral-800 shadow-xl border border-neutral-200 dark:border-neutral-700 p-5 animate-[fadeSlideIn_.15s_ease]">
            <div className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">
              解散后该清单下的标签将变为未分组，确定解散？
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDissolveConfirm(null)}
                className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300"
              >
                取消
              </button>
              <button
                onClick={() => {
                  dissolveH1(dissolveConfirm.tagId)
                  if (activeListId === dissolveConfirm.tagId) setActiveListId('all')
                  setDissolveConfirm(null)
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white"
              >
                确认解散
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 设置弹窗（AI 名字等） ===== */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/30"
          onMouseDown={(e) => e.target === e.currentTarget && setShowSettings(false)}
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
                if (e.key === 'Escape') setShowSettings(false)
              }}
              placeholder="AI 角色显示名"
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700
                bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-haruto-sea"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowSettings(false)}
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
      )}

      {/* 番茄钟浮动条 */}
      {(pomoTarget || pomo) && (
        <PomodoroBar
          task={pomoTarget}
          state={pomo}
          onStart={(minutes, mode) => startPomo(minutes, mode)}
          onToggle={togglePomo}
          onAbandon={() => { setPomo(null); setPomoTarget(null) }}
          onComplete={completePomo}
        />
      )}
    </div>
  )
}

// H2 标签新建/编辑弹窗：emoji（最多2字符）+ 名称（必填）+ 18色板
function SubTagModal({ title, initial, onSave, onCancel }: {
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
