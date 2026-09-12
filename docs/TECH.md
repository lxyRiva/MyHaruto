【文件】TECH.md
【用途】技术设计——架构、数据、关键机制
【读】开发、规划
【写】仅规划层
【上游】STRUCTURE.md（结构设计）
【下游】DEV_RULES.md（开发铁律）
【更新】架构或数据层变化时
【最后更新】2026-09-13

# MyHaruto 技术文档

本文件讲清**架构、数据、关键机制**。
文件在哪 → STRUCTURE.md｜开发规则 → DEV_RULES.md｜做什么 → PROJECT_ROADMAP.md

## 1. 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 桌面壳 | Electron 31 | 主进程 `electron/main.js`：窗口 + IPC 委托 |
| 构建 | Vite 5 + @vitejs/plugin-react | `base:'./'`；端口锁死 5173+strictPort |
| 界面 | React 18 + TypeScript strict | 全函数组件 + hooks |
| 样式 | Tailwind CSS 3.4 | darkMode:'class'；主色 `haruto-sea=#3d7ea6` |
| 图表 | ECharts 5（饼图/折线）+ 纯 div 网格（热力图） | 热力图不用 ECharts |
| 农历 | solarlunar | 类型补丁 `src/solarlunar.d.ts` |
| 3D（M2.5 起） | three + @react-three/fiber | 已批准例外（DEV_RULES §4） |

**无路由库**（单窗口 useState 切页）、**无状态管理库**（App 单点 state + props 下发）、**无 UI 组件库**（全部手写 Tailwind）。

## 2. 启动与构建

```bash
npm install        # 首次
npm run dev        # 开发模式：vite + wait-dev.js 轮询 5173 → 拉起 electron
npm run build      # 打包界面到 dist/（不打包 exe）
```

- 日常使用：双击桌面「MyHaruto」快捷方式（electron.exe 加载 dist；**改代码后必须 npm run build 才生效**）
- 验收迭代：用 `npm run dev`（热更新）
- 安装版 exe（electron-builder）：后期任务

## 3. 数据架构

### 3.1 存储位置（M2-V12 起多文件态）

```
%APPDATA%/MyHaruto/data/     ← 默认，可通过 config.json 的 dataDir 更改
├── manifest.json            # 版本管理
├── user/ settings.json + profile.json
├── tasks/ tasks.json + subTags.json + sections.json
├── focus-sessions.json
├── habits/ habits.json + records.json
├── important-days.json / period-records.json / sleep-records.json
├── health/ ai/ town/ albums/ travel/ my-art/
├── logs/changes.jsonl       # 删除留痕
└── backups/                 # 滚动 7 份
```

主进程 `electron/data/store.js` + `layout.js` 读写（原子写 `.tmp→rename`），preload 桥接 `window.myharuto` 五通道（`db:get/save` + `data:open-dir/info/change-dir`）。

仓库内 `data/` 仅 AI 空模板（隔离铁律见 §3.4）。

完整目录见 DATA_LAYOUT.md。

### 3.2 数据模型（`src/shared/types.ts`）

```
Task{ id, title, description, dueDate('YYYY-MM-DD'|null), done, createdAt,
      tagId, parentTaskId(子→父,无限嵌套), priority('none'|low|mid|high'),
      masterTaskId(关联归并), isPinnedToday, isPinnedGroup }
Tag{ id, name, color, isSpecial }
FocusSession{ id, taskId, startedAt(ISO), minutes }
Habit{ id, name, icon, monthlyTarget, createdAt } / HabitRecord{ id, habitId, date }
ImportantDay{ id, title, type, date, repeatYearly, remindDaysBefore, note, archived? }
PeriodRecord{ id, startDate, endDate|null }
SleepRecord{ id, date, bedtime('HH:MM') }
MomentEntry{ id, category, groupKey, imagePath, caption, eventDate, sortOrder, createdAt }
settings{ theme, aiName }
```

**不入库的展示态**（存 localStorage，前缀 `mh-`）：
习惯年目标覆盖、重要日图样/重复模式/置顶/农历标记、侧栏折叠。

### 3.3 数据自愈（`electron/data/store.js`）

加载时自动：补齐缺失字段、断开 parentTaskId 环/悬空引用。
**新增字段必须同时在 defaultDb 和 loadDb 兜底。**

### 3.4 AI 数据域（M5/M6 使用）

- **统一消息模型**：`data/ai/chat-messages.json`——留言与对话统一时间线，每条带 `sourceType`（chat/task/importantDay/period/town）；记忆库唯一提取源
- **模板集**（仓库内）：ai/chat-messages.json + persona.md + memories/{fragments,episodes,entity-profiles}.json + agent/activity-log.json
- **数据隔离铁律**：仓库 `data/` 只放空模板 + 默认人设；用户实体数据在 `%APPDATA%`，永不上传，`.gitignore` 兜底
- **角色渲染解耦**：CharacterStage 组件 + character-state.json——2D/3D 只换资产与渲染层，任务系统/记忆库/对话逻辑不动

## 4. 关键机制

### 4.1 专注时长归并（统计铁律）

`Stats.tsx` 的 `rootTaskIdOf(taskId)`：沿 parentTaskId 上溯到顶 → 若有 masterTaskId 则跳过去继续（递归 + 环保护）。
**日视图按原任务**、**月/年按归并结果**。

### 4.2 计时互斥

`usePomodoro` 内 `pomoCompletingRef`（useRef 锁）：PomodoroBar 与 PomodoroPage 都可能触发"到点完成"，锁保证一次计时只记一条 FocusSession。
正计时暂停/继续用 `swAccum` 累计（防双倍计数）。
**completePomo 的 50ms 解锁是既有设计，勿改。**

### 4.3 递归任务树防环

`utils/taskTree.ts` 提供 `rootOf/treeOf/isRootAggregated/collapsedOf`——唯一树操作实现。
渲染递归时用 `_seen: Set<string>` 记祖先链，环数据只显示一层不炸。数据层还有 loadDb 自愈双保险。

### 4.4 年度热力图（竖排连续填充）

每列 14 格连续排日期；月份标签每 3 个月；5 级固定阈值（0/30/60/120 分钟）——不随最大值自适应（1 分钟必须最浅档）。

### 4.5 业务规则单点化（DEV_RULES §10）

任务系统 `features/tasks/utils/` 是唯一实现层：

| 文件 | 职责 |
|---|---|
| taskTree.ts | 树操作（rootOf/treeOf/collapsedOf） |
| taskDelete.ts | 删除（collectTreeIds） |
| taskMeta.ts | 卡片 meta 行组装 |
| taskSort.ts | 排序（唯一实现，含 pinnedGroupFirst 内聚） |
| groupPosition.ts | 组位置（positionDateOf，横板单点显示） |

**视图组件只做布局适配，禁止复制业务逻辑。**

### 4.6 Electron 环境禁令

`window.prompt/alert/confirm` 在 Electron 静默失效：
- 编辑 → 行内 input
- 确认 → 居中 modal
- 菜单 → FloatingMenu（支持二级子菜单）
- 提示 → Toast（`shared/components/Toast.tsx`）

## 5. hooks 结构（M2 重构后）

| Hook | 签名 | 说明 |
|---|---|---|
| useTaskActions | (db, setDb) | 任务/清单/检查事项数据变更 |
| useTaskSelectors | (db, selectedId) | 纯派生，无副作用（selected/focusPool/countOf/minutesOf） |
| usePomodoro | — | 番茄状态机（含互斥锁） |
| useHabits / useImportantDays | (db, setDb) | 各域数据变更 |

App 保留：路由四件套、L2 UI 及拖拽、props bundle、JSX 组合。

## 6. 相关文件

- 开发规则：DEV_RULES.md
- 文件结构：STRUCTURE.md
- 数据目录细节：DATA_LAYOUT.md
- 产品需求：PRD.md
