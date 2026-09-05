# MyHaruto 重构任务卡总集 v1.1（定稿）

> 日期：2026-09-06 ｜ 基线：HEAD=7b4978f ｜ 数据粒度：B 域文件（已拍板）｜ 书影/旅游入口：可点占位页+可排序（已拍板）
> 本文件是重构全程的唯一任务来源，替代此前所有零散卡。规划 Agent 维护，其余 Agent 只读执行。
> 变更记录见文末；卡与代码实际冲突时停手回报规划 Agent，禁止现场变通。

## 0. 使用说明（各会话接力方式）

- 开发/测试/审查各开独立会话（DEV_RULES §8）。会话开工第一条消息模板：
  `读 docs/DEV_RULES.md 与 docs/REFACTOR_CARDS.md 的 RF-Px 卡，按卡执行。`
- 测试会话只跑验收出报告不修码；审查会话开工先声明「切换为审查模式」。
- 每卡走完「开工锁→开发→测试→审查→用户手测→授权 commit→文档同步」才开下一卡。

## 一、执行总纲（全程有效，各卡不再重复）

**通用交付链**（每卡每段必走）：

```
开工锁自查（开发）→ 实现 + 交付报告（大白话：改了什么/为什么）
→ 测试报告（清单逐项 ✅/❌，测试会话禁止修码）
→ 审查报告（P0 阻塞/P1 应修/P2 建议，审查会话开工先声明「切换为审查模式」）
→ 用户手测 + 授权 commit → 文档同步（STRUCTURE/TECH/CONTINUE）→ 下一卡
```

**三道锁（文件落地保障）**：

1. **开工锁**（开发自查，写进交付报告）：`pwd` 为 D 盘真实路径并贴报告；`git status` 干净；HEAD 含上一卡提交；node_modules 存在。
2. **落位锁**（测试执行）：逐条跑卡内核对表——写了「新建」的文件必须存在且行数达标，写了「删除」的文件必须不存在，grep 计数命中。
3. **Scope 锁**（审查执行）：`git diff --stat <上卡锚>..<本卡>` 文件清单 ⊆ 卡内允许清单，越界打回；搬移 commit 的 diff 零逻辑变更。

**责任矩阵**：

| 角色 | 职责 |
|---|---|
| 规划 Agent | 拆卡、验收标准、跨卡仲裁、规格冲突终审；P6a 前出书影/旅游细案 |
| 开发 Agent（独立会话） | 按卡实现，只动允许清单，交交付报告 |
| 测试 Agent（独立会话） | 跑机械验收+落位核对，只出报告不修码 |
| 审查 Agent（独立会话，开工声明审查模式） | DEV_RULES 合规、Scope 锁、搬移审计 |
| 维护 Agent（独立会话，按需召唤） | 回滚预案执行、fix 卡（先诊断报告后动手） |
| 用户 | 手测点验、授权 commit/push（唯一提交门） |

**卡总览**：

| 卡 | 内容 | commit | 风险 | 回滚锚 |
|---|---|---|---|---|
| RF-P1 | App 抽 4 hook+1 选择器+SubTagModal；建 DEV_RULES/会话边界 | 1 | 低 | tag `refactor-start` |
| RF-P2a | BoardView 拆分（纯搬移） | 1 | 低 | P1 提交 |
| RF-P2b | 全部页现代化+右栏统一+删旧面板 | 1 | 中 | P2a 提交 |
| RF-P3a | 全库纯搬移归位 | 1 | 低 | P2b 提交 |
| RF-P3b | 布局抽取 L1/L2/MainArea | 1 | 中低 | P3a 提交 |
| RF-P3c | 日期收口+useLocalStorage+L1 排序 | 1 | 中低 | P3b 提交 |
| RF-P4 | repository+写盘加固+数据文件夹按钮 | 1 | 中 | P3c 提交 |
| RF-P5 | 数据多文件化（B 方案） | 1 | 中高 | P4 提交+pre-migration 快照 |
| RF-P6a | 书影/旅游新功能 | 1 | 中 | P5 提交 |
| RF-P6b | 死代码清扫 | 1 | 低 | P6a 提交 |

---

## 二、RF-P1：App.tsx 状态与逻辑抽取

> **给开发 Agent**。开工先读 docs/HANDBOOK.md → DEV_RULES.md（本卡创建）→ TECH.md。

**目标**：App.tsx 1458 → ≤800 行。UI/交互/行为**零变化**。

**开工前一次性动作**：
1. `git tag refactor-start`（全轮回滚锚点）
2. 新建 `docs/DEV_RULES.md` = **附录 A 全文**
3. 更新 CONTINUE.md：①收尾轮遗留③标"并入 RF-P2b"、④标"并入 RF-P3c" ②新增「团队会话边界」小节（内容=DEV_RULES §8 + 当前阶段行）

**允许新建**：
```
src/shared/utils/id.ts                              # uid() 迁入
src/features/tasks/hooks/useTaskActions.ts
src/features/tasks/hooks/useTaskSelectors.ts
src/features/tasks/components/SubTagModal.tsx       # PALETTE/H2_PALETTE/EMOJI_PRESETS 随迁导出
src/features/pomodoro/hooks/usePomodoro.ts
src/features/habits/hooks/useHabits.ts
src/features/important-days/hooks/useImportantDays.ts
```
**允许修改**：src/App.tsx（只删不新增逻辑）、docs/STRUCTURE.md、docs/TECH.md、CONTINUE.md
**禁止触碰**：src/pages/*、src/components/BoardView.tsx、electron/*、vite.config.ts、一切数据文件

**Hook 签名约定（硬性）**：数据变更类 hook 统一 `export function useXxx(db: Db, setDb: Dispatch<SetStateAction<Db>>)`。**特例：`useTaskSelectors` 为纯派生 hook，签名为 `useTaskSelectors(db: Db, selectedId: string | null)`——不接收 setDb、不得产生任何副作用**（selected/selectedChildren 只依赖 selectedId，塞 setDb 就是邀请误用）。db 留 App 单点；hook 无自有持久状态、无 useEffect、不引 useRef（pomoCompletingRef 除外，归 usePomodoro）。跨域组合（如删任务停计时器）一律不做，留 App。

**步骤**（原样搬运，逻辑零改动）：
1. `useTaskActions`：addTask/addTaskWithOptions/addSubtask/addSubtaskInline/updateTask/deleteTask/deleteTaskRecursive/updateTaskTag/updateTaskSection/toggleTaskDone/aggregateSectionDone/togglePinnedToday/setMasterTask/setTaskPriority/setTaskReminder/updateTaskDue/addTaskToSection + 检查事项 4 个（toggleChecklistItem/addChecklistItem/updateChecklistItem/deleteChecklistItem）+ 清单组织件（addTag/updateTag/dissolveH1/addSubTag/updateSubTag/deleteSubTag/addSection/insertSectionNextTo/updateSection/moveSection/deleteSection）
2. `useTaskSelectors(db, selectedId)`：mainTasks/specialTags/normalTags/countOf/tagMap/todayStr/localDateOf/todaySessions/todayMinutes/minutesOf(含 useMemo)/focusPool/selected/selectedChildren。**localDateOf 时区注释原样保留**
3. `usePomodoro`：pomo/pomoTarget/pomoCompletingRef/startPomo/togglePomo/completePomo + 新增 abandonPomo（收拢两处内联 onAbandon，行为等价）。completePomo 的 `setTimeout 50ms` 解锁**不许优化**
4. `useHabits`：addHabit/updateHabit/deleteHabit/toggleHabitCheck
5. `useImportantDays`：addImportantDay/updateImportantDay/deleteImportantDay/markPeriod/deletePeriod/reopenPeriod
6. SubTagModal 迁 features/tasks/components/，App 改 import
7. 三关：`tsc --noEmit` 零错误 → `npm run build` → `npm run dev` 自测

**测试验收**：App.tsx ≤800；新文件各 ≤500；`grep "window.myharuto" src/App.tsx`=2；App 剩余 useState 仅 db/loaded/page/selectedId/activeListId/activeSubTagId/L2 UI 组（expandedH1s/h1Menu/subTagMenu/renamingH1/subTagModal/dissolveConfirm/renamingSectionId/addingList/newListName/newListColor/l2Drag/l2Over）/settings 组/showSettings+aiNameDraft/detailWidth，无任务/习惯/重要日/番茄状态残留；features/ 无跨 feature import；DEV_RULES/STRUCTURE/TECH/CONTINUE 已同步。
**用户手测**：L1+主题+设置改名｜L2 全操作｜任务勾选/右键九项/日期/子任务/检查事项｜番茄页内+浮动条全操作｜习惯/重要日/生理期/月历/统计｜重启数据完整。
**回滚**：`git reset --hard refactor-start`。

---

## 三、RF-P2a：BoardView 拆分（纯搬移）

**目标**：BoardView.tsx 1499 行拆散归位，主文件 ≤500。**diff 零逻辑变更**（审查逐行对照）。

**新建**（自 BoardView.tsx 原样拆出，12 导出各归其位）：
```
features/tasks/utils/boardSort.ts              ← boardSort
features/tasks/types.ts                        ← Priority
features/tasks/components/DateTimePickers.tsx  ← HourWheel/DayStepper/RemindPicker/DatePickerModal
features/tasks/components/taskMenu.ts          ← CardBundle/buildTaskContextMenu
features/tasks/components/ChecklistRow.tsx     ← ChecklistRow/ChecklistAddRow
features/tasks/components/TaskCard.tsx / BoardColumn.tsx（主文件超 500 才拆）
features/tasks/components/BoardView.tsx        ← BoardCallbacks + default，≤500 行
```
**修改**：6 个依赖方 import 改道（App/NewTaskBar/ListTaskCard/TaskDetailPanel/Recent7View/Today）
**删除**：src/components/BoardView.tsx（搬空即删）

**测试验收**：tsc/build 过；落位核对（旧文件不存在、新文件 ≤500、`grep "from './BoardView'" src/`=0）。
**用户手测**：看板视图 A/B 全操作回归。
**回滚**：`git reset --hard <P1提交>`。

---

## 四、RF-P2b：全部页现代化 + 右栏统一

**目标**：收尾轮遗留③落地。全部页换 ListTaskCard；**右栏统一为 TaskDetailPanel，旧右栏 B 整块删除不搬移**（消灭双面板）。

**修改**：
```
pages/Tasks.tsx               ← TaskNode 换 ListTaskCard 分组渲染（今天/即将到来/更早/无日期/已完成）；
                                 新建行换 NewTaskBar；props 从 taskProps 切 listViewProps
pages/Today.tsx               ← 删死代码：TaskNode/PRIORITY_DOT/PRIORITY_LABEL/descendantIds（todayStr 留 P3a）
components/TaskDetailPanel.tsx ← 补齐为旧面板功能超集（映射表见下）
App.tsx                       ← 删旧右栏 B（1128-1228 行整块）；右栏 A 条件扩为
                                 selected && (page==='today' || page==='tasks')
```
**禁止**：新建任何 Legacy 文件。

**功能映射表**（开发交付物，验收逐项打勾，一项不落）：

| 旧右栏 B 功能 | 去向 |
|---|---|
| 标题 + 完成态 ✅ 前缀 | TDP 补 |
| H1 清单色胶囊徽章（无 section 时按 task.tagId 显示） | TDP 补（兼容 H1-only） |
| 日期 + 创建时间行 | TDP 已有/补齐 |
| 子任务：勾选切换、行内添加、**每条独立 🍅** | **TDP 新增子任务区块**（onUpdateTask/onAddSubtask/onPomodoro，listViewProps 已有） |
| 描述 textarea | 已有 |
| AI 留言区 | 已有 |
| 🍅开始专注 / 🗑删除 底部按钮 | TDP 新增动作行 |
| 收起 × | 已有 |

**测试验收**：tsc/build；`grep "TaskNode|PRIORITY_DOT|descendantIds" src/pages/Today.tsx`=0；`grep "Legacy" src/`=0；App.tsx ≤800。
**用户手测重点**：
- 全部页右栏按映射表逐项点验（子任务勾选/添加/子任务🍅、开始专注、删除）
- 全部页选中任务→右栏出现；点 × 关闭；切换另一任务右栏内容跟随——三项行为与今日页完全一致
- 从全部页点 L2 的 H1/H2 跳看板时右栏收起，无旧任务详情残留（Bug2 场景回归）
- 今日/最近7天/看板回归
**回滚**：`git reset --hard <P2a提交>`。

---

## 五、RF-P3a：全库纯搬移归位（diff 零逻辑变更）

```
git mv：
pages/Today.tsx, Tasks.tsx  → features/tasks/pages/
pages/Calendar.tsx          → features/calendar/pages/
pages/Habits.tsx            → features/habits/pages/
pages/Stats.tsx             → features/stats/pages/
pages/ImportantDays.tsx     → features/important-days/pages/
pages/PomodoroPage.tsx      → features/pomodoro/pages/
pages/Placeholder.tsx       → app/layout/
components/ListTaskCard/NewTaskBar/TaskDetailPanel/Recent7View → features/tasks/components/
components/PomodoroBar.tsx  → features/pomodoro/components/
components/FloatingMenu.tsx, icons.tsx → shared/components/
src/types.ts                → shared/types.ts（全库 import 修正，机械改动）
```
**测试验收**：`src/pages/` `src/components/` `src/types.ts` 均不存在；tsc/build 过。
**审查**：diff 仅路径与 import。**回滚**：reset 到 P2b。

---

## 六、RF-P3b：布局抽取（行为零变化）

**新建**：
```
app/layout/L1Sidebar.tsx          ← NAV+aside 原样迁出（不含排序功能）
app/layout/L2Sidebar.tsx          ← renderH1/renderSubTagRow/L2 树 + h1Menu/subTagMenu/renamingH1/
                                     subTagModal/dissolveConfirm/addingList 组/l2Drag/l2Over/expandedH1s（纯 UI 态随迁）
app/layout/MainArea.tsx           ← L3 路由 switch + 右栏 A
app/layout/SettingsModal.tsx      ← 设置弹窗迁出。状态归属：showSettings 留 App（受控开关），
                                     aiNameDraft/saveSettings 随组件迁出（每次打开重新挂载、草稿重置）；
                                     props = { open: boolean, onClose: () => void, aiName: string, onSave: (v: string) => void }，
                                     App 的 onSave 内联 setDb 写 settings.aiName；
                                     解散确认弹窗随 L2Sidebar 迁出
```
**修改**：App.tsx——路由四件套封装 nav API（openToday/openRecent7/openAll/openH1/openH2）传 L2Sidebar。
**明确不做**：Modal/ConfirmModal 壳统一（降级 P6b 可选项）。

**测试验收**：App.tsx ≤500 行；tsc/build。
**用户手测**：全视图路由 + Bug2 场景（最近7天点 H2、H1 切换、看板进右栏收起）+ 设置弹窗改名保存/取消/草稿重置。
**回滚**：reset 到 P3a。

---

## 七、RF-P3c：日期收口 + useLocalStorage + L1 排序

**步骤**：
1. `shared/utils/date.ts`：先 grep 盘点重复实现（todayStr/localDateOf/addDaysStr/nextWeekdayStr，**单引号与模板串两种 localStorage 写法都要查**），只收口重复、行为逐字节一致（时区注释原样随迁）。
2. `shared/hooks/useLocalStorage.ts`：detailWidth 切换接入；其余 mh-* 存量键登记不迁移（动到时顺手）。
3. **L1 排序**（遗留④，产品决策已拍板）：右键菜单 上移/下移/恢复默认；顺序存 `mh-l1-order`（PageKey 数组）；chat/town 锚底不可动；**album/travel 去 disabled 改置灰——左键进占位页、右键参与排序**（P6 接真页面）。

**测试验收**：date.ts 定义点全库唯一；`grep "mh-l1-order"` 生效；detailWidth 拖宽重启保持。
**用户手测**：L1 排序重启保持；书影/旅游可点进占位页；月历/统计/重要日日期显示回归（date 收口风险点）。
**回滚**：reset 到 P3b。

---

## 八、RF-P4：repository 收口 + 写盘加固 + 数据文件夹入口

**渲染端行为零变化，只动数据通道。**

```
新建 src/data/repository.ts   # 渲染端唯一数据入口 loadAll()/persist()，含 StorageDriver 接口（P5 换实现接口不动）
新建 src/data/types.ts
新建 electron/data/store.js   # defaultDb/loadDb（自愈整体迁入）/saveDb 自 main.js 迁入；
                              # saveDb 原子写（同目录 .tmp → fs.renameSync）；
                              # startupBackup：启动时 db.json → backups/db-<时间戳>.json，滚动保留 7 份
修改 electron/main.js         # 瘦身为窗口+IPC 委托；preload 增加 openDataDir()（shell.openPath(dataDir)）；
                              # 设置弹窗加「打开数据文件夹」按钮（必做）
修改 src/global.d.ts          # window.myharuto 增加 openDataDir(): Promise<void> 类型声明
                              # （声明缺失 = tsc 直接挂，属三关前置而非可选项）
修改 App.tsx 两个数据 useEffect → repository；docs/TECH.md 数据章节
禁止触碰：db:get/db:save IPC 契约、vite.config.ts
```
**测试验收**：`grep "window.myharuto" src/` 仅 repository.ts；`grep "fs\.\|ipcMain" electron/main.js`=0；`grep "openDataDir" src/global.d.ts preload.js` 双命中；backups/ 出现文件；按钮可开目录。
**用户手测**：全功能回归+重启数据完整。
**回滚**：reset 到 P3c。

---

## 九、RF-P5：数据多文件化（B 方案，最高风险卡，维护 Agent 待命）

**核心设计：IPC 契约不变（db:get/db:save），只换主进程内部实现，渲染端零改动。**

**目标布局**（`%APPDATA%/MyHaruto/data/`）：
```
manifest.json                # { dataVersion: 2, migratedAt, appVersion }
user/settings.json
tasks/tasks.json │ tasks/subTags.json │ tasks/sections.json
focus-sessions.json
habits/habits.json │ habits/records.json
important-days.json │ period-records.json │ sleep-records.json   # sleepRecords 为空也建文件
logs/operations.log          # 人读操作行
logs/changes/YYYY-MM-DD.json # 删除留痕 {ts, domain, action:'delete', ids}
backups/                     # pre-migration 快照 + 滚动备份
ai/ assets/                  # M5/P6 起创建，本卡不建空目录
```
**步骤**：
1. store.js 多文件 loadAll：manifest 判版本→读域→按域自愈（原 loadDb 逻辑拆到各域）→拼装 Db。
2. persist：各域序列化与磁盘**字符串比对只写变化域**（原子写）；域数组变短→diff 被删 id→logs/changes 追加。
3. **启动加载三分支（统一幂等，写完 manifest 后永不再入 b/c）**：
   a. manifest.json 存在 → 多文件 loadAll；
   b. manifest 缺失且 db.json 存在 → 迁移：拆域写入 → db.json 移入 `backups/db-pre-migration-<ts>.json` → 写 manifest → 记日志；**任一步失败中止迁移、保留 db.json、回退旧加载路径，应用照常可用**；
   c. manifest 与 db.json 均不存在（**全新安装**）→ `defaultDb()` 初始化 → 直接按多文件结构写入 → 写 manifest → operations.log 记一条「首次初始化」。
4. `scripts/verify-migration.mjs`（纯 node 内置，无新依赖）逐域 deepStrictEqual；package.json 加 `verify:data`。
5. TECH.md/DEV_RULES 数据章节更新为 manifest 版本迁移。

**测试验收**：`grep "window.myharuto" src/` 仍仅 repository.ts；渲染端 diff 零逻辑变更；scripts 存在。
**用户手测**：迁移无感→数据文件夹肉眼可读→全功能回归→重启两次稳定→**删一个任务 logs/changes/ 出记录**→`npm run verify:data` PASS→backups 有快照。
**回滚预案（维护 Agent）**：关应用→删 manifest.json 与各域文件→复制 `backups/db-pre-migration-*.json` 为 `data/db.json`→启动验证。

---

## 十、RF-P6a：书影清单 + 旅游札记

**⚠️ 前置门：开工前规划 Agent 出 UI 细案规格卡，用户确认后才开发。** 本卡为骨架：
- 数据：`data/albums/albums.json`、`data/travel/travel.json`，条目 `{id, groupKey(书影=YYYY-MM/旅游=地点), imagePath, caption, eventDate, sortOrder, createdAt}`；主进程新增 IPC `assets:import`（dialog 选图→复制进 `data/assets/<域>/`→返回相对路径）。
- 页面：书影=按月相册流、跨年折叠；旅游=按地点分组。L1 两图标去 soon 接真页面。
- 文件：`features/albums/{pages,components,hooks}/`、`features/travel/同构`、repository 增两域。

**验收**：建条目/导图/浏览/删除（删除留痕进 logs/changes）；数据落新域文件；全应用回归。回滚：reset 到 P5。

---

## 十一、RF-P6b：死代码清扫

ImportantDays 死 Toggle 组件；todayStr re-export 残留确认消除；PLACEHOLDER_PAGE 两项移除；全库无引用导出清理（逐项列出经审查确认才删）。**可选项**：Modal/ConfirmModal 壳统一（审查评估真实重复后决定，避免为抽而抽）。回滚：reset 到 P6a。

---

## 附录 A：docs/DEV_RULES.md 全文（RF-P1 创建，含 §8）

```markdown
# MyHaruto 开发铁律（全 Agent 必读）
> 违反任何一条，审查 Agent 直接打回，不进验收。

## 1. 目录与依赖
- 功能代码入 src/features/<域>/（components/hooks/utils/types），应用壳 src/app/，
  跨域共享 src/shared/，数据访问 src/data/。
- features 之间禁止 import 对方内部文件。要复用：升 shared/，或经 App props 下发，
  或从对方 index.ts 显式导出并登记到本文件白名单（当前白名单：空）。
- hooks 只放状态与逻辑；纯展示组件不碰 db/handler，数据全走 props。

## 2. 数据访问
- P1-P3 阶段：数据变更只允许出现在 App.tsx 与 hooks；页面组件禁直接 setDb/window.myharuto。
- P4 起：一切数据操作走 src/data/repository.ts，组件与 hooks 禁直接 IPC。
- localStorage 仅经 shared/hooks/useLocalStorage，key 前缀 mh-，展示态不入库。
  现有 key：mh-detail-panel-width、mh-year-target-{id}、mh-day-style-{id}、
  mh-day-repeat-{id}、mh-day-pinned-{id}、mh-day-lunar-{id}、mh-sidebar
  （注意模板串写法，开发时 grep 复核补全）。
- 加字段铁律：Task/Db 新字段必须同时给 default 值 + 主进程自愈兜底，旧数据 undefined 即默认。

## 3. 代码规模
- 新文件 ≤500 行、新函数 ≤50 行。存量超标文件（ImportantDays/Habits 等）
  不做全量补课，动到时顺手拆。
- 同样逻辑出现 ≥3 处必须提 shared/utils；日期一律 shared/utils/date.ts（P3c 落地后）。

## 4. 禁令
- window.prompt/alert/confirm（Electron 静默失效）：编辑=行内 input，确认=居中 modal，
  菜单=FloatingMenu。
- UI 层禁 emoji（用户数据除外：习惯 icon、H2 标签 emoji）；图标加 icons.tsx。
- 禁新增 npm 依赖（例外须用户批准）；禁改 vite 端口 5173/strictPort。
- 左键=详情、右键=菜单，任何层级任务不许分叉。

## 5. 质量与提交
- 三关：tsc --noEmit 零错误 → npm run build 成功 → 用户验收 → commit；push 需授权。
- 一卡一 commit（子卡各一），禁跨卡混改。格式：refactor(P1): xxx / feat(P6a): xxx / fix: xxx。
- 搬移与修改分开：纯搬移 commit 的 diff 不得含逻辑变更；新文件直接落 features/ 最终位置。

## 6. 文档同步
- 每卡收尾更新 STRUCTURE.md/TECH.md/CONTINUE.md；任何功能变化回写 PRD.md。

## 7. 已知耦合备忘（动这些区域先读）
- pomoCompletingRef 互斥锁：浮动条+专注页双完成入口，动计时先懂它。
- 路由四件套 page/activeListId/activeSubTagId/selectedId 必须成套同步（Bug2 教训）。
- draggable 与 onClick 不共元素，拖拽用把手模式。
- 日期只存 YYYY-MM-DD 字符串，比对走本地时区（toISOString 是 UTC，曾致时区 bug）。
- 主题过渡 transition 是视觉签名（VISUAL_EFFECTS.md），勿删。

## 8. Agent 会话边界（2026-09-06 起强制）
- 开发/测试/审查必须各开独立会话，禁止同会话兼任多角色。
- 测试会话只跑验收清单、出测试报告，禁止修改任何代码；发现问题回报，由开发会话修复。
- 审查会话开工第一条消息必须显式声明「切换为审查模式」，全程只读代码与 diff，不改文件。
- 规划会话只出卡不改码。各角色通过 CONTINUE.md 接力，每卡收尾更新为下一卡状态。
```

---

## 变更记录

| 版本 | 内容 |
|---|---|
| v1.0 | 六阶段十卡定稿（P3 拆 a/b/c、TaskDetailPanelLegacy 取消、入口决策拍板、数据文件夹按钮提前 P4、会话边界入 DEV_RULES） |
| v1.1 | 五补丁：①useTaskSelectors 特例签名 (db, selectedId) 纯派生 ②RF-P4 补 src/global.d.ts 类型声明 ③RF-P5 加载三分支含全新安装 ④RF-P3b SettingsModal 状态归属（showSettings 留 App 受控）⑤RF-P2b 手测补右栏一致性与 L2 收起两条 |
