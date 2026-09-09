# MyHaruto 技术文档

> 给下一个开发者/Agent：本文讲清架构、数据、关键机制和开发流程。配合 STRUCTURE.md（文件地图）与 HANDBOOK.md（上手指南）食用。

## 1. 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 桌面壳 | Electron 31 | 主进程 electron/main.js：窗口+本地数据读写（IPC） |
| 构建 | Vite 5 + @vitejs/plugin-react | base:'./'（Electron file:// 加载相对路径）；**端口锁死5173+strictPort**（防 wait 链错位） |
| 界面 | React 18 + TypeScript (strict) | 全部函数组件+hooks |
| 样式 | Tailwind CSS 3.4 | darkMode:'class'；自定义色 haruto-sea=#3d7ea6 |
| 图表 | ECharts 5（饼图/折线）+ 纯div网格（热力图） | 热力图不用ECharts（像素级控制） |
| 农历 | solarlunar | 类型声明补丁在 src/solarlunar.d.ts（包的 exports 不带 types） |

无路由库（单窗口 useState 切页）、无状态管理库（App 单点 state+props 下发）、无 UI 组件库（全部手写 Tailwind）。

### 1.1 features/ 分层（RF-P1 起）
数据变更与派生逻辑按域拆入 hooks（RF-P1）：
- `src/features/tasks/hooks/useTaskActions.ts`：任务/清单/检查事项 32 个数据变更动作，签名 `(db, setDb)`
- `src/features/tasks/hooks/useTaskSelectors.ts`：任务派生数据（selected/focusPool/countOf/minutesOf 等），纯派生签名 `(db, selectedId)` 无副作用
- `src/features/pomodoro/hooks/usePomodoro.ts`：番茄钟状态机（pomo/pomoTarget/互斥锁/startPomo/togglePomo/completePomo/abandonPomo），completePomo 的 50ms 解锁是既有设计勿改
- `src/features/habits/hooks/useHabits.ts`、`src/features/important-days/hooks/useImportantDays.ts`：各域数据变更
- `src/features/tasks/components/SubTagModal.tsx`：H2 标签弹窗，PALETTE/H2_PALETTE/EMOJI_PRESETS 随迁导出
- `src/shared/utils/id.ts`：uid()
- App.tsx 保留：路由四件套、L2 UI 及拖拽、props bundle、JSX；数据动作全部从 hooks 解构

## 2. 启动与构建

```bash
npm install        # 首次
npm run dev        # 开发模式：vite + wait-dev.js 轮询5173 → 拉起 electron（支持热更新）
npm run build      # 打包界面到 dist/（不打包exe）
```
- **日常使用**：双击桌面「MyHaruto」快捷方式（electron.exe 加载 dist；**改代码后必须 npm run build 才生效**）
- **验收迭代**：用 npm run dev（改代码即时热更新）
- 真正的安装版 exe（electron-builder）尚未配置，属后期任务

## 3. 数据架构

### 3.1 存储位置（RF-Data-2 起多文件态）
`%APPDATA%/MyHaruto/data/`（默认；可通过 %APPDATA%/MyHaruto/config.json 的 dataDir 更改）——多文件布局：manifest.json + 8 域文件 + settings.json + logs/（changes.jsonl 删除留痕）+ backups/（启动滚动 7 份）。主进程 electron/data/store.js+layout.js 读写（原子写 .tmp→rename），preload 桥接 `window.myharuto`（db:get/db:save/data:open-dir/data:info/data:change-dir）。仓库内 data/ 仅 AI 空模板（隔离铁律见 §3.4）。db.json 迁移后改名 .migrated.bak 让位。

### 3.2 数据模型（src/shared/types.ts，与各域文件一一对应；域拆分见 electron/data/layout.js）
```
Task{ id,title,description,dueDate('YYYY-MM-DD'|null),done,createdAt,
      tagId, parentTaskId(子→父，无限嵌套), priority('none'|low|mid|high),
      masterTaskId(关联归并), isPinnedToday }
Tag{ id,name,color,isSpecial }        // isSpecial=愿景标签排L2顶部
FocusSession{ id,taskId,startedAt(ISO),minutes }
Habit{ id,name,icon,monthlyTarget,createdAt } / HabitRecord{ id,habitId,date }
ImportantDay{ id,title,type, date('MM-DD'每年重复|'YYYY-MM-DD'),repeatYearly,
              remindDaysBefore,note, archived? }
PeriodRecord{ id,startDate,endDate|null }   // null=进行中（仅开始日标记，不蔓延）
SleepRecord{ id,date,bedtime('HH:MM') }     // M6 AI 问询写入
settings{ theme:'light'|'dark' }
```
**注意**：部分展示态字段不入库，存 localStorage：习惯年目标覆盖值(mh-year-target-{id})、重要日图样(mh-day-style-{id})、重复模式(mh-day-repeat-{id})、置顶(mh-day-pinned-{id})、农历标记(mh-day-lunar-{id})、侧栏折叠(mh-sidebar)。

### 3.3 数据自愈（electron/main.js loadDb）
加载时自动：补齐缺失字段（版本兼容）、断开 parentTaskId 环/悬空引用（历史脏数据曾致白屏）。**新增字段必须同时在 defaultDb 和 loadDb 兜底**。

### 3.4 AI 数据域（设计基线 2026-09-08；P5 建模板，M5 起用）
- **统一消息模型**：`data/ai/chat-messages.json`——Haruto 留言与对话统一时间线（留言=聊天记录的一部分），每条 `{id, role, content, imagePath?, sourceType:'chat'|'task'|'importantDay'|'period'|'town', createdAt}`；**记忆库只从此文件提取**。
- **模板集（仓库内 data/，P5 建）**：`ai/chat-messages.json`（空数组）、`ai/persona.md`（默认人设）、`ai/memories/{fragments,episodes,entity-profiles}.json`（空结构）、`ai/agent/activity-log.json`。
- **数据隔离铁律**：GitHub 仓库内 `data/` 只放空模板+默认人设；用户实体数据在 `%APPDATA%/MyHaruto/data/`，永不上传，.gitignore 兜底校验。
- **角色渲染解耦**：CharacterStage 组件 + character-state.json 状态文件——2D/3D 只换资产与渲染层，任务系统/记忆库/对话逻辑不动。

## 4. 关键机制

### 4.1 专注时长归并（统计铁律）
Stats.tsx 的 `rootTaskIdOf(taskId)`：先沿 parentTaskId 上溯到顶 → 若顶任务有 masterTaskId 则跳过去继续（递归+环保护）。日视图按原任务、月/年按归并结果。

### 4.2 计时互斥
App 的 `pomoCompletingRef`（useRef 锁）：PomodoroBar 与 PomodoroPage 都可能触发"到点完成"，锁保证一次计时只记一条 FocusSession。正计时暂停/继续用 swAccum 累计（恢复时 startedAt=now，暂停时 swAccum+=增量，防双倍计数）。

### 4.3 递归任务树防环
Today.tsx `TaskNode` 递归渲染，`_seen: Set<string>` 记录祖先链，环数据只显示一层不炸。数据层还有 loadDb 自愈双保险。

### 4.4 年度热力图（竖排连续填充）
每列14格连续排日期（cells 数组按天生成，slice(c*14, c*14+14) 切列）；月份标签每3个月；5级固定阈值（0/30/60/120分钟）——**不随最大值自适应**（1分钟必须是最浅档）。

### 4.5 Electron 环境禁令
**window.prompt/alert/confirm 在 Electron 静默失效**——一切编辑用行内 input；一切确认用居中 modal；一切菜单用 FloatingMenu（支持二级子菜单 hover 右侧展开）。

## 5. 开发铁律（血泪教训）

1. **改完必过三关**：`tsc --noEmit`（零错误）→ `npm run build`（成功）→ 提交。vite build 不做类型检查，tsc 必须单独跑
2. **从 D 盘真实路径构建**：`D:\Software\Zcode_appdata\.zcode\workspace\default\MyHaruto`（C 盘 junction 路径会让 Vite HTML 插件解析失败）
3. import 驱动的白屏：default/named import 写错（如 `import TaskNode from` 应为 `import { TaskNode } from`）编译能过但运行时白屏——tsc 能抓，别跳过
4. 左键=详情右键=菜单的交互对任何层级任务一致，不许分叉
5. UI 禁 emoji（用户数据的习惯 icon 除外）；图标加到 src/components/icons.tsx
6. 文件职责见 STRUCTURE.md；多 Agent 并行时按文件划界，App.tsx/Today.tsx 是热区归主脑
