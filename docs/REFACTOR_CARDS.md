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

**四道锁（文件落地保障）**：

0. **基线锁**（规划 Agent，派发前执行）：`git diff --stat <上卡锚>..HEAD` 确认无未入卡的代码改动；行数类验收线按派发时 HEAD 实测重算，偏差 >10% 先修卡再派发（2026-09-06 起，源自 RF-P1 行数预算误差教训）。
1. **开工锁**（开发自查，写进交付报告）：`pwd` 为 D 盘真实路径并贴报告；`git status` 干净；HEAD 含上一卡提交；node_modules 存在。
2. **落位锁**（测试执行）：逐条跑卡内核对表——写了「新建」的文件必须存在且行数达标，写了「删除」的文件必须不存在，grep 计数命中。
3. **Scope 锁**（审查执行）：`git diff --stat <上卡锚>..<本卡>` 文件清单 ⊆ 卡内允许清单，越界打回；搬移 commit 的 diff 零逻辑变更。

**测试交接（2026-09-06 用户定）**：RF-P1/P2a 过渡期由规划层代行机械核验；**RF-Fix1 为最后一卡代行，RF-P2b 起所有测试环节由独立测试会话执行**，规划层不再代跑。

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
| RF-Fix1 | 聚合语义树化+aiName 全局同步（两 bug 修复） | 1 | 中 | P2a 提交（0754339） |
| RF-Fix2 | 横板已完成折叠区+子任务计时显示+死声明清理 | 1 | 中 | Fix1 提交（2044e3f） |
| RF-Fix3 | 聚合取消级联+折叠区空心框+done 沉底 | 1 | 中 | Fix2 提交（4f83c9a） |
| RF-P2b | 右栏统一+Today死代码+NewTaskBar（范围缩减版） | 1 | 中 | Fix3 提交（a744503） |
| RF-P3a | 全库纯搬移归位（已审计，按审计 diff 落 commit） | 1 | 低 | P2b 提交（38bafa5） |
| RF-Fix3a | 重要日运行时修复（阻塞 bug，诊断先行） | 1 | 中 | P3a 提交 |
| RF-P3b | 布局抽取 L1/L2/MainArea | 1 | 中低 | P3a 提交 |
| RF-Fix3c | 任务系统视图一致性统一（两段 commit，**待用户确认范围放行**） | 2 | 中高 | P3b 提交（66480d2） |
| RF-P3c | 日期收口+useLocalStorage+L1 排序（**暂缓，排 Fix3c 后**） | 1 | 中低 | Fix3c 提交 |
| RF-P4 | repository+写盘加固+数据文件夹按钮 | 1 | 中 | P3c 提交 |
| RF-P5 | 数据多文件化（B 方案） | 1 | 中高 | P4 提交+pre-migration 快照 |
| RF-P6a | 书影/旅游新功能 | 1 | 中 | P5 提交 |
| RF-P6b | 死代码清扫 | 1 | 低 | P6a 提交 |
| RF-Fix4 | 验收 bug 批量修复（池已入 9 项：B1-B4/N1-N2/R1-R3） | 1 | 中 | P6b 提交 |
| RF-P7 | 设置中心四分区（前置门：细案待出） | 1 | 中 | Fix4 提交 |

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

> **验收裁定记录（v1.3，2026-09-06）**：App.tsx 实际 952 行 vs 卡线 800。根因=规划层制定卡时高估可搬运量（实际 P1 范围可搬 ~530 行而非 ~700；L2 拖拽/右栏拖宽/弹窗/双右栏本就按设计留给 P2b/P3b，非该搬未搬）。裁定：本卡验收线放宽为 **≤1000，952 达标通过**；剩余收缩由 P2b（删旧右栏 B 约 100 行）与 P3b（布局抽取）自然完成。规划层已独立复验：7 新文件行数/全部 grep 门槛/tsc 复验/useState 零残留全过。

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

> **验收记录（v1.4，2026-09-06）**：机械门全绿（变更范围 M×6+D×1+新增×8 零越界、8 文件行数 2/15/285/183/115/475/192/278、6 依赖方 14 行增行全为 import、体量对账 1499→1545、tsc PASS）。四项报备裁定全接受：①taskMenu.ts→tsx（MenuEntry.label 含 JSX，技术必然）②localToday/pad2 转 export（拆分后多文件共用，最小导出）③BoardColumn 二拆（卡预案触发）④features→src/components 过渡态（P3a 覆盖）。commit **0754339**。用户验收发现两 bug（聚合语义/aiName 硬编码）→ 立 **RF-Fix1** 修复，P2b 等 Fix1 解锁。审查专项1结论（v1.5 补记）：**缩进差异已于 commit 前消除**——提交版不存在纯缩进差异块（多重集比对 1436=1436 全等），后人无需按报备寻找。

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

> **v1.6 范围更新**：Tasks.tsx 换 ListTaskCard 渲染已由 RF-Fix2 提前完成（收尾轮遗留③清账）。本卡剩余=①右栏统一：删旧内联面板 B，全部页切 TaskDetailPanel（功能映射表复核，P2b 原表仍有效）②Today.tsx TaskNode 死代码删除（Fix2 后已无引用）③Tasks 新建行换 NewTaskBar。
> **v1.7 硬性补注**：右栏（及一切新接线）的子任务勾选**必须走 toggleTaskDone**（树语义统一入口），禁止直用 updateTask 改 done——旧面板 B 的子任务 checkbox 现走 updateTask 直改，统一时必须改道，否则 Fix3"取消子勾→根 done=false"联动不生效。todayStr 本轮保留在 Today.tsx（P3c 收口）。
> **验收记录（v1.8，2026-09-06）**：用户手动验收通过并授权 commit **38bafa5**（4 文件 +121/−396；App.tsx 841 行 ≤850 达标）。测试报告环节由用户手测合并代行。右栏统一落地后，RF-Fix4 池的 B1（子任务右栏编辑）成为下一顺位问题。

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

**测试验收**：tsc/build；`grep "TaskNode|PRIORITY_DOT|descendantIds" src/pages/Today.tsx`=0；`grep "Legacy" src/`=0；App.tsx ≤850（v1.7 基线锁重算：Fix3 后实测 937 行，删旧面板 B/taskProps 后预计 ~830，原 ≤800 系旧基线产物）。
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

**测试验收**：App.tsx **≤550 行（目标 ≤500）且内容仅剩路由编排 + 全局数据 useEffect + 各布局组件组合**，不因 L1/L2/MainArea 拆净程度死扣行数；tsc/build。

> **验收记录（v1.12，2026-09-06）**：开发/测试/审查三报告通过。App.tsx 实测 **316 行**（远优于 ≤550），四布局组件各 ≤500；STRUCTURE.md 全量重写入本 commit（旧 pages/components 描述移除，App 职责=数据 hooks+nav API+布局组合）。**审查裁定备案**：①L2 纯 UI 态切页重置=行为语义合理变化，落此记录 ②死解构 tagMap/todayStr/mainTasks、③renderH1/renderSubTagRow 超 50 行、④L2Sidebar todaySessions 类型偏松 → 三项登记 **RF-P6b**。commit **66480d2**（6 文件 +950/−691）。
**用户手测**：全视图路由 + Bug2 场景（最近7天点 H2、H1 切换、看板进右栏收起）+ 设置弹窗改名保存/取消/草稿重置。
**回滚**：reset 到 P3a。

---

## 七、RF-P3c：日期收口 + useLocalStorage + L1 排序

**步骤**：
1. `shared/utils/date.ts`：先 grep 盘点重复实现（todayStr/localDateOf/addDaysStr/nextWeekdayStr，**单引号与模板串两种 localStorage 写法都要查**；**盘点范围含 Recent7View.tsx 的本地 localToday() 与 Today.tsx 的 todayStr()——审查登记 v1.5**），只收口重复、行为逐字节一致（时区注释原样随迁）。
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

## 十一、RF-P6b：死代码清扫 + 重构收官

ImportantDays 死 Toggle 组件；todayStr re-export 残留确认消除；PLACEHOLDER_PAGE 两项移除；全库无引用导出清理（逐项列出经审查确认才删）。**审查登记（v1.5）**：过度导出 4 处——taskMenu.tsx 的 PRIO_META/prioDot/withCheck（仅文件内使用）与 SubTagModal.tsx 的 EMOJI_PRESETS；usePomodoro.ts:21 内联 import 类型改顶部 import type。**审查登记（v1.12，P3b）**：L2Sidebar 死解构 tagMap/todayStr/mainTasks 清除；renderH1/renderSubTagRow 函数超 50 行拆分；L2Sidebar todaySessions 类型偏松收紧。**可选项**：Modal/ConfirmModal 壳统一（审查评估真实重复后决定，避免为抽而抽）。回滚：reset 到 P6a。

**重构收官动作（RF-P7 设置中心验收通过后由规划 Agent 执行，属定版仪式不属开发 commit；原挂 P6b 后，2026-09-06 因 P7 登记移位）**：
1. package.json `"version": "0.1.0"` → `"1.0.0"`，提交 `chore: v1.0.0 重构完成（模块化+数据独立化落地）`
2. 打附注 tag `v1.0.0`，message「重构完成：模块化代码 + 域文件数据 + 全卡验收通过」
3. 用户授权后 push（master + 两个 tag：v0.1.0 起点 / v1.0.0 终点）
版本约定：**起点 v0.1.0（已钉 7b4978f），终点 v1.0.0**。

---

## 十二、RF-Fix1：聚合语义树化 + aiName 全局同步（修复卡，插 P2a 后 / P2b 前）

> **给开发 Agent**。行为变化卡（非搬移），源自 P2a 验收两 bug。语义第 4/6 条为用户拍板定稿，不得再议。

**前置盘查（步骤 0，两份清单随交付报告上交，先盘查后动手）**：
- `grep -rn "aggregated\|aggregateSectionDone" src/` → 全部读写点清单（已知锚点：useTaskActions.toggleTaskDone/aggregateSectionDone、BoardColumn 折叠区过滤、分区菜单「聚合」项、TaskCard/BoardView 渲染）
- `grep -rn "'Haruto'" src/ electron/` → 硬编码点分类（A 类默认兜底 / B 类显示串）

**修复 A：任务聚合语义（树化）**

语义定义：树 = 主任务 + 全部子孙（parentTaskId 链）；**折叠区成员判定唯一依据 = 根任务的 aggregated**（渲染/逻辑沿 parentTaskId 上溯取根标志；历史数据散落在子任务上的 aggregated 字段一律无视——不做数据修复、不改 electron 数据结构）。

规则（已拍板）：
1. 勾选主任务为完成 → 级联全部子孙 done=true + 根 aggregated=true，整树入折叠区 **（⚠ v1.6 修订：级联已被 RF-Fix3 取消——勾主不再强制子孙 done，以 Fix3 卡为准）**
2. 主任务已完成且全部子孙已完成（任意路径达成）→ 根 aggregated=true 自动聚合（含无子孙的孤立主任务）
3. 子任务勾选完成：不触发聚合，除非恰好达成规则 2
4. 折叠区取消主任务勾选 → 根 done=false + aggregated=false，整树回待办区；**子任务 done 保留**（灰显跟随回待办区）【拍板：保留完成态】
5. 折叠区内取消任一子孙勾选 → 整树回待办区（根 aggregated=false），各 done 态保持现状
6. 分区右键「聚合已完成」菜单项**保留**，语义不变（该分区 done 未 aggregated 的任务标入折叠区），可反复使用；已聚合任务呆在折叠区不受影响【拍板：保留，不断聚合】。注意：手动聚合单个 done 子任务时其主任务未完成——子任务单独入折叠区（现状语义），不拉扯主任务
7. 回区后重新达成规则 1/2 → 整树再次自动聚合（聚合⇄回区可循环）

实现锚点：useTaskActions.toggleTaskDone 重写（树级联 + 规则 2/5 判定，沿 parentTaskId 上溯找根）；aggregateSectionDone **保留不动**；BoardColumn 折叠过滤改根判定；TaskCard/BoardView 如读自身 aggregated 改根判定；「聚合」菜单项不动。

**修复 B：aiName 全局同步**
- A 类（默认值兜底收敛）：types.ts 初始 state、electron/main.js defaultDb、App 的 `|| 'Haruto'` → 新建 `src/shared/constants.ts` 导出 `DEFAULT_AI_NAME = 'Haruto'`，全部兜底引用它；**全库字面量只许此一处**
- B 类（显示串改读 settings）：盘查清单逐处改为经 props/settings 链读 db.settings.aiName（已知位置：L1 悬浮 title、占位页、任务详情留言区、生理期 AI 入口、聊天页占位、设置弹窗默认值等，以盘查为准）；组件拿不到的补穿线
- 验收：`grep -rn "'Haruto'" src/ electron/` → 仅 constants.ts 一处；手测：改 AI 名后六类显示位全部跟随，重启保持

**三关**：tsc 零错误 → npm run build → npm run dev 按下方矩阵逐条自测。
**行为测试矩阵（交付报告必附逐条结果）**：
1. 主+2 子：勾主 → 全灰整树入折叠区
2. 折叠区取消主勾 → 整树回待办，子任务仍灰
3. 折叠区取消一个子任务勾 → 整树回待办
4. 逐个勾完子任务+主 → 最后一勾自动整树入折叠区
5. 树未全完成时不自动聚合；手动「聚合」可把 done 子任务单独折叠，反复可用且已折叠者不动
6. 回区后再勾完 → 再次自动聚合（循环验证）
7. 改 AI 名 → 六类显示位全部跟随，重启保持
8. 今日/最近7天/全部页勾选无回归；统计时长归并无回归

**允许触碰**：useTaskActions.ts、BoardColumn.tsx、TaskCard.tsx、BoardView.tsx、taskMenu.tsx、ListTaskCard.tsx、Today.tsx、Recent7View.tsx、TaskDetailPanel.tsx、App.tsx、src/shared/constants.ts（新建）、src/types.ts、electron/main.js（仅 A 类兜底一处）、相关 docs
**禁止**：数据结构变更、vite.config.ts、其余页面
**commit**：`fix(RF-Fix1): 聚合语义树化+aiName 全局同步`
**回滚**：`git reset --hard 0754339`

> **验收记录（v1.5，2026-09-06）**：行为矩阵 8/8 PASS（UI 实测）；验收期发现回归 1 个（折叠区父卡无法展开）当场修复（parentFolded 分区标志）。**electron 字面量裁定（规划层）**：grep `'Haruto'` = 3 处（TS 权威 constants.ts 1 + electron/main.js 兜底 2 带同步锚注释）**接受**——CJS 无法 require TS，建桥文件属零收益复杂度；显示链全走 App 兜底，行为不受影响，DEV_RULES"显示名不硬编码"目标已达成。commit **2044e3f**（8 文件 +123/−22）。

---

## 十三、RF-P7：设置中心（骨架登记，排 P6b 后、收官前）

> **⚠️ 前置门：开工前规划层出细案（数据源/交互/UI 规格），用户确认后才开发。** 本卡为需求登记防遗失。

四分区需求（用户 2026-09-06 口述登记）：
1. **日期与时间**：月历显示农历（solarlunar 已有依赖）；一周开始于周一；显示法定节假日+调休。⚠️ 开放点：节假日调休数据源需定（离线内置年度 JSON vs 其他），细案拍板。
2. **外观**：留出 UI 皮肤切换接口（settings.skinId 字段已存在）。
3. **桌面部件**：留出桌面小部件接口（Electron 特性，本期只留口不做实现）。
4. **API 接入**：多模型 API Key 配置入口（智谱/DeepSeek/Kimi/自定义）。⚠️ 本地明文存储需在细案声明（单机单人可接受）；是 M5 AI 接入的直接前置。

**验收线**：待细案定稿后补。**回滚**：reset 到 P6b 提交。

---

## 十四、RF-Fix2：横板已完成折叠区 + 子任务计时显示 + 死声明清理（修复卡，Fix1 后 / P2b 前）

> **给开发 Agent**。源自 Fix1 后手测两 bug + 审查警告 1。行为变化卡。**规划层最后一代行机械核验到此为止无误——本卡起测试仍归规划层代行（P2b 才交接测试会话），但交付报告须附逐条自测证据。**

**修复 A（Bug1）：横板页面「已完成」折叠区**
- 症状根因（用户实测+定因）：Fix1 后主任务完成置根 aggregated=true，横板页面（今日/最近7天/全部）无折叠渲染，聚合任务被过滤消失。
- 目标行为（用户拍板）：
  * 四横板视图（Today/Recent7View/Tasks 及 ListTaskCard 渲染链）底部新增「已完成」折叠区，与看板折叠区同语义
  * 主任务 done && 根 aggregated → 整树含全部子孙入区（子孙跟随父，复用 rootOf 上溯）
  * 子任务单独 done && 根未聚合 → 仅原地灰显，不入区
  * 区默认折叠，标题行「已完成 N」（N=区内根任务数），小三角点击展开/收起；不持久化（不新增 localStorage key）
  * 展开态取消勾选 → 整树回待办原位（Fix1 规则 4/5 语义天然支持，视图无需额外处理）
  * **成员口径：各区已完成区成员 = 该视图现有筛选条件 ∩ 根 aggregated，不跨视图泄漏**（Today 只收今天到期/置顶的树，Recent7 只收其日期区间，Tasks 按其筛选分组）
- 实现：BoardColumn 的 rootOf/根判定**提取为 features/tasks/utils/tree.ts** 供看板与四横板共用（同域复用，避免第 3 处重复触犯 DEV_RULES §3）；各区现有分组逻辑不动，已完成区固定垫底。

**修复 B（Bug2）：子任务独立计时显示**
- 子任务卡 meta 行补：灰色小闹钟图标 + 该任务独立专注分钟数（minutesOf(taskId)）——今日/最近7天/全部/看板四视图统一
- 数据已正确（focusSessions 按 taskId 记录，归并只在统计页）；ListTaskCard 已收 minutesOf；TaskCard（看板）若无则 App boardProps 增传（App.tsx 允许）

**修复 C：死声明**
- 删除 App.tsx:52 的 pomoCompletingRef 死声明（审查警告 1；互斥锁已完整随迁 usePomodoro，App 零引用）

**三关**：tsc 零错误 → npm run build → npm run dev 手测。
**手测清单（交付报告逐条附证）**：
1. 横板勾主任务完成 → 整树入底部已完成区，区默认折叠显示 N
2. 展开区取消主勾 → 整树回待办原位，子任务仍灰
3. 子任务单独完成 → 原地灰显不进区
4. 展开态取消子任务勾 → 该子任务复原、整树出区（主任务灰显原位）
5. 看板折叠区语义无回归（Fix1 矩阵 1-6 抽查）
6. 四视图子任务卡显示闹钟+分钟；完成一段该子任务专注后数字更新
7. `grep pomoCompletingRef src/App.tsx` = 0；番茄双入口（浮动条+专注页）并发完成只记一条（DEV_RULES §7 第一耦合点重点复测）
8. Recent7View 的逾期/今天/未来分组与 Tasks 五分组显示正常，已完成区垫底不遮蔽

**允许触碰**：Today.tsx、Recent7View.tsx、Tasks.tsx、ListTaskCard.tsx、TaskCard.tsx、BoardColumn.tsx、features/tasks/utils/tree.ts（新建，rootOf 提取）、App.tsx（boardProps.minutesOf + 死声明删除）、NewTaskBar.tsx（如 meta 涉及）、相关 docs
**禁止**：electron/*、数据结构、vite.config.ts
**commit**：`fix(RF-Fix2): 横板已完成折叠区+子任务计时显示+死声明清理`
**回滚**：`git reset --hard 2044e3f`

> **验收记录（v1.6，2026-09-06）**：手测清单 8/8 PASS（用户手测通过）。规划层机械核验：工作区 8M+tree.ts 全在卡范围、tsc PASS、App pomoCompletingRef=0、App.tsx 937 行。**范围备案**：Tasks.tsx 换 ListTaskCard 渲染已随修复 A 提前落地（渲染链统一必要部分），收尾轮遗留③实质清账，P2b 范围相应缩减。开发⑤-2 报备的"done 混排"由用户拍板转入 RF-Fix3 修复 B（done 沉底）。commit **4f83c9a**（9 文件 +215/−69）。

---

## 十五、RF-Fix3：聚合取消级联 + 折叠区空心框 + done 沉底（修复卡，Fix2 后 / P2b 前）

> **给开发 Agent**。行为变化卡。**本卡修订 Fix1 规则 1**——用户实际使用后拍板的语义演进，冲突处以本卡为准。

**修复 A：勾主任务不再级联子任务**
新语义（取代 Fix1 规则 1 的级联部分）：
1. 勾选主任务完成 → 根 done=true + 根 aggregated=true（整树入折叠区）；**子孙 done 保持各自状态，不强制**；折叠区内未完成子任务显示空心框（渲染以自身 done 为准，父卡灰显不传染子卡样式）
2. Fix1 规则 2 保持：根已完成且全部子孙已完成（任意路径）→ 自动聚合
3. Fix1 规则 4 保持：折叠区取消主勾 → 根 done=false + aggregated=false，整树回待办，子任务状态保持
4. **修订规则 5**：折叠区取消任一子孙勾选 → 整树回待办（根 aggregated=false）**且根 done 自动置 false**（子孙有未完成时主任务不得保持完成态）；其余子孙状态保持
5. 折叠区内勾选未完成子任务 → 仅自身 done=true；已在区无需聚合动作
- 实现锚点：useTaskActions.toggleTaskDone（**删除级联写入**，新增规则 4' 的根 done 联动）；TaskCard/DoneFoldSection 折叠区子卡渲染核实"以自身 done 渲染"（Fix2 渲染链已就绪，预计改动极小）
- 数据兼容：Fix1 期间被级联置 done 的子任务**不做数据修复**（用户可手动取消）

**修复 B：done 沉底**
- boardSort 增加完成维度：**同日期同优先级内，done 未聚合任务排在待办之后**；聚合任务不参与排序（已折叠）
- 生效范围：boardSort 全部消费方（看板列内 + 横板日期组）语义一致
- 不改变组间顺序（日期/优先级/分组结构不动，仅组内 done 沉底）

**三关**：tsc 零错误 → npm run build → npm run dev 手测。
**手测清单（交付报告逐条附证）**：
1. 主任务（含 1 完成 1 未完成子任务）勾完成 → 整树入折叠区；完成子灰显、未完成子空心框
2. 折叠区取消未完成子任务勾 → 整树回待办，且主任务自动变未完成（灰显消失）
3. 折叠区取消主勾 → 整树回待办，子任务状态保持
4. 主任务+全部子孙逐个勾完 → 自动聚合（规则 2 回归）
5. done 沉底：同日期同优先级组内完成卡排在待办卡下方；看板列内同样生效
6. Fix2 手测 1-4/8 回归（折叠区开合/分组/垫底不遮蔽）
7. 番茄/统计无回归

**允许触碰**：useTaskActions.ts、boardSort.ts、TaskCard.tsx、ListTaskCard.tsx、tree.ts（如需）、BoardColumn.tsx、Today.tsx、Recent7View.tsx、Tasks.tsx、相关 docs
**禁止**：electron/*、数据结构、vite.config.ts
**commit**：`fix(RF-Fix3): 聚合取消级联+折叠区空心框+done 沉底`
**回滚**：`git reset --hard 4f83c9a`

> **验收记录（v1.7，2026-09-06）**：用户手测通过；规划层尽调核验（diff 逐段目检=卡语义逐条对应、tsc PASS、范围 3 文件零越界）后代提交。commit **a744503**（3 文件 +23/−23）。渲染侧"空心框"零改动（Fix2 渲染链本就以自身 done 渲染，卡预案命中）。

---

## 十六、RF-Fix4：验收 bug 批量修复（P6b 后 / P7 与收官前）

> **执行时点**：P6b 完成后，规划层按下方池子出细目卡（逐条：根因/修法/验收）→ 开发修复 → 测试会话回归 → 用户验收 → 单 commit `fix(RF-Fix4): <清单摘要>`。**不混入 P6b**（P6b 是机械清扫+搬移审计卡）。回滚：reset 到 P6b 提交。

**Bug 池（用户 2026-09-06 交付，9 项）**：

【Bug】
- **B1 子任务右栏独立编辑**：右栏选中子任务时显示主任务；期望子任务与主任务功能一致（可编辑/可嵌套/可设日期/可番茄）
- **B2 子任务番茄计时显示不一致**：右键菜单入口计时后子任务栏不显示，右栏 🍅 入口能显示；两入口数据应共通
- **B3 检查事项模式默认展示**：有检查事项内容时默认显示检查事项视图，无内容时默认任务文本
- **B4 检查事项模式描述不可编辑**：期望可编辑，与任务文本共通

【需求】
- **N1 过期任务「顺延」**：今天/最近7天已过期组右侧加「顺延」按钮 → 点击弹确认框 → 确认后全部过期任务 dueDate=今天
- **N2 看板组名拖拽横向排序 + 任务拖拽跨组移动**（旧需求）：⚠️ feature 级，出细目卡时评估是否拆独立卡；拖拽与 click 共存有 Bug2 血案前科，必须把手模式
- **N3 重要日「已归档折叠区」缺失**（RF-Fix3a 手测发现，dev 报备）：PRD §3.6 有记载但实现从未落地；出卡时拍板——补建功能 or 从 PRD 划掉

【对账待定（疑似与 Fix3 重叠，出卡时逐条核实）】
- ~~R1 删除语义双轨~~：**转 RF-Fix3c 吸收**（分叉#6，删除语义 utils 单点化+确认统一）
- **R2 勾主任务不级联**：⚠️ Fix3 规则1' 已修（a744503）；若用户所指为残留问题，出卡前补现象描述
- **R3 done 沉底**：Fix3 已做「同日期同优先级」内沉底；若残留现象是「同日期跨优先级不沉底」，需拍板 done 维度是否提到优先级之前

---

## 十七、RF-Fix3a：重要日运行时修复（阻塞 bug，诊断先行，P3a 后 / P3b 前）

> **⚠️ 诊断先行卡（维护层 SOP：先诊断后修复）。规划层取证已推翻"图片相对路径断裂"假设，根因以 console 证据为准，禁止按假设瞎修。**

**规划层取证（2026-09-06，开发免重查）**：
- ImportantDays.tsx 资源引用搬移前后**逐字节相同**（38bafa5 旧 src/pages L124/156 = 现新路径同行号，`src={`assets/days/${png.file}`}`）。该写法是 **URL 相对**（相对文档 URL，非源文件位置），源文件搬家不影响它——"文件深度变化致路径断裂"假设不成立
- 全库扫描：引用 public/ 资源的仅 ImportantDays 一处（5 行），**其他页面无同类**（原卡要求 3 已由规划层完成）
- "页面点不动"高度疑似 **运行时 JS 异常 → Vite 错误遮罩盖全屏**（fixed 遮罩=无法点击），图片挂为次生现象；搬移引出**循环 import** 为头号候选（tsc 不抓循环依赖，静态审计盲区）
- P3a 为已审计未提交工作区 → **提交序：P3a 先按已审计 diff 落 commit（回滚锚），本卡修复单独提交**

**步骤**：
0. **全新启动** `npm run dev`（排障经验①：先排除 HMR 断连坏窗口）+ `ELECTRON_ENABLE_LOGGING=1` 收渲染进程 console 报错**原文**入报告 → 依证据定位真根因
1. 修复根因（候选：循环 import 改造/运行时异常；修复不得引入新耦合，features 互禁铁律仍有效）
2. 插画引用处置（**规划层裁定，覆盖用户原建议**）：**禁止改 `/assets/...` 形式**——Electron file:// + base './' 下以 `/` 开头解析到磁盘根，必炸；若 console 证实图片确 404：9 张 PNG 迁 `src/assets/days/` + Vite `import`（构建期按 base 重写，最稳）；若图片实为次生现象则维持现状 URL 相对不动
3. 三关 + 重要日全操作手测（增删改/9 插画/农历/生理期弹窗/归档折叠）+ 九视图回归
**允许触碰**：src/features/important-days/**、src/assets/days/（如走迁移方案，9 张 PNG git mv）、public/assets/days/（迁出后删）、相关 docs
**禁止**：electron/*、vite.config.ts
**commit**：`fix(RF-Fix3a): 重要日运行时修复+插画引用加固`
**回滚**：P3a 提交

> **审查方法学补丁（v1.9）**：搬移类卡审查增查**资源/URL/动态路径字符串**与运行时手测——本次静态审计（多重集+双重 diff）对"字符串原样搬运但运行时受搬家影响"的盲区已证实；后续 P3b/P6b 搬移审查单子上必须含此项。

> **验收记录（v1.10，2026-09-06）**：**零代码改动，无 commit 产物**——全新启动后重要日功能恢复，真根因=环境态（HMR 坏窗/双实例/localStorage 回滚族，排障经验①族），卡内取证（图片字符串未变、全库仅一处 public 引用）直接缩小了排查面。三条排障经验已登记 **DEV_RULES §9**（禁强杀/禁双开/dev-prod origin 隔离+诡异症状先全新启动）。诊断先行卡设计按预期生效：先排除环境，代码零背锅。P3a 85f6d68 维持，解锁 P3b。
> **手测项勘误（v1.11）**：本卡手测清单中「归档折叠」经 dev 报备确认**无对应功能区**（PRD §3.6 记载 vs 实现缺失）→ 转 Fix4 池 N3，出卡时拍板补建或划 PRD。

---

## 十八、RF-Fix3c：任务系统视图一致性统一（细目卡，P3b 后 / P3c 前，两段 commit）

> **⚠️ 待用户确认范围后放行。** 背景：深度比对发现横板链（Today/Recent7View/Tasks/ListTaskCard/DoneFoldSection）与看板链（BoardView/BoardColumn/TaskCard/悬空弹窗）六组分叉（规划层 grep 已证实聚合判定散布 7 文件、Popover 内联 TaskCard、删除双轨并存）。本卡根治：业务规则 utils 单点化 + 卡片基元统一 + 详情容器等价 + 新建对齐。配套 **DEV_RULES §10 视图一致性铁律**（v1.13 已入库）。

**步骤 0 盘查（交付报告附）**：六组分叉逐一 grep 定位，产出「文件+行号」分叉对照表（规划层已知锚点：聚合判定散布 BoardColumn/Recent7View/ListTaskCard/useTaskActions/Tasks/Today/tree.ts 共 7 文件；Popover 内联于 TaskCard（activePopupId 机制）；DoneFoldSection 导出自 ListTaskCard；deleteTask/deleteTaskRecursive 并存 useTaskActions L48/L52；boardSort 消费方=Recent7View/BoardView/Today/BoardColumn）

**第一段 commit（utils 单点化，行为零变化）**：
1. **taskTree.ts**（= tree.ts 升级更名，**非第二份**）：保留 rootOf/isRootAggregated；新增 treeOf(tasks,id)/isTreeComplete(tasks,rootId)/collapsedOf(tasks)（折叠区成员判定唯一实现）。useTaskActions 规则 1'/2/4/5' 的内联遍历改调纯函数；DoneFoldSection 与 BoardColumn 折叠过滤同源调用
2. **taskDelete.ts**（新建）：collectTreeIds(tasks,id)（目标+全部子孙）唯一实现；useTaskActions 的 deleteTask/deleteTaskRecursive 合并为 **deleteTaskTree**（内部走 collectTreeIds）；删除确认 modal 抽共享组件（右键路径已有确认改接同一 modal；右栏路径本段只接线、行为变化放第二段）
3. **taskMeta.ts**（新建）：buildTaskMeta(task,{minutesOf,tagMap}) → {dateText,priorityFlag,tagBadge,alarmIcon,minutes,checklistProgress} 唯一组装；ListTaskCard/TaskCard meta 行改消费
4. **taskSort.ts**（= boardSort.ts 升级更名，含 Fix3 done 沉底）；全消费方改道；盘查若发现看板链第二套排序则归一
5. **checklistDefaultMode(task)** 提取（入 taskMeta.ts）：检查事项默认视图判断唯一实现
**验收**：审查 grep——每个共享函数全库唯一定义点；tsc/build；行为零变化（Fix1-3 矩阵抽查）

**第二段 commit（组件统一，含三处行为增强）**：
6. **TaskCardBase.tsx**（新建，≤300 行、props ≤12、纯展示零业务）：勾选框+标题+meta 行（吃 taskMeta）+子任务折叠递归（吃 taskTree）；ListTaskCard 与 TaskCard 重构为薄壳——**视图差异（点击=右栏选中 vs 悬空弹窗、选中态样式、菜单接线）留在消费层，禁止塞进基元**
7. **TaskPopover 功能等价**：TaskDetailPanel 拆出 TaskDetailContent（内容区组件），右栏与悬空弹窗同渲染（一处实现两处布局；弹窗加宽度/滚动约束）
8. **看板新建对齐 NewTaskBar**：补日期/优先级/标签（NewTaskBar 抽字段区组件供列内紧凑变体复用；sectionId 归属语义保持）
9. **删除语义统一（消费段）**：右栏删除按钮改 deleteTaskTree+确认；右键菜单接同一 modal
**验收（用户定稿）**：双链同操作矩阵——勾选/取消/聚合/取消聚合/删除/新建/折叠 × 横板+看板逐项对照；共享函数 grep 唯一性复验；tsc/build/dev 手测

**Fix3c-1 手测追加三 Bug（v1.14 入验收清单，必须修）**：
- **Bug1 看板勾子任务独自聚合**（横板正常）：规划层取证=Fix1 规则1 历史级联遗留——子任务残留 aggregated=true，看板折叠散件分支吃旧数据，横板只看根 aggregated 故两副面孔。修法方向：散件判定收窄为"本会话显式聚合"或渲染层无视子任务残留 aggregated；**不改历史数据**
- **Bug2 看板折叠区取消子勾不整树退回**：与 Bug1 同源（散件语义 vs 树语义），收敛后复验
- **Bug3 关联主任务点击候选无反应**：接线链已证完整（App→bundle→视图→taskMenu），嫌疑=FloatingMenu 二级子菜单 close 竞态（120ms closeTimer 丢 onClick）或闭包旧引用；运行时诊断定案（ELECTRON_ENABLE_LOGGING）
- Bug4（子任务优先级+专注时间显示）留 RF-Fix4 池，不混入本卡

**v1.15 追加（用户指令）：Fix3c-2 commit 前最终门**：
1. **Bug3 补修已实证落地**（规划层复核 FloatingMenu L98-120：closest 守卫真实在位——外关时 `!ref.contains && !closest('[data-floating-submenu]')` 才 onClose，与标记配对消费；测试 item 10 需复测闭环）
2. **交互审计任务**（commit 前必跑，测试+开发协同）：全量排查任务系统弹层互斥——①TaskCard 悬空弹窗（popRef 外关+Escape+activePopupId 全局互斥）× FloatingMenu（ref 外关+Bug3 子菜单放行）双向：弹窗开→右键开菜单，菜单是否抢关弹窗/菜单关后弹窗是否滞留 ②右栏（MainArea 常驻，无外关）× FloatingMenu：右栏开→右键卡片→菜单项执行后右栏状态是否一致 ③枚举全部弹层（悬空弹窗/FloatingMenu/DatePickerModal/TaskDeleteConfirmModal/SubTagModal/SettingsModal）两两交叉，确认无"一个关了另一个滞留"变体 ④双链矩阵最终逐格复跑
3. **Bug5（看板详情弹窗关闭后菜单滞留）**：属本卡范围，审计中定位根因修复（初判：菜单与弹窗各自独立外关，弹窗因外点关闭时 mousedown 同时落在菜单容器外→菜单本应同关；滞留=菜单外关判定被什么放行——修复后枚举回归）
4. 交互审计通过+Bug5 修复 → 才允许 commit Fix3c-2
5. **裁定备案**：子任务独立编辑（池 B1）+ 检查事项描述编辑（池 B4）确认为 Fix4 旧账，不阻塞本卡 commit

**行为变化声明（方向已拍板，手测显式验证）**：看板新建补三字段｜右栏删除改递归+确认｜Popover 功能等价化
**允许触碰**：features/tasks/{utils,components}/**、hooks/useTaskActions.ts、app/layout/MainArea.tsx（接线）、App.tsx（接线）、相关 docs
**禁止**：其他 features 域、electron/*、数据结构、vite.config.ts
**commit**：`refactor(Fix3c-1): 任务业务规则 utils 单点化` → `refactor(Fix3c-2): TaskCardBase/Popover/NewTaskBar 统一`
**回滚**：Fix3c-1 → P3b（66480d2）；Fix3c-2 → Fix3c-1

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
| v1.2 | RF-P6b 增收官动作：version→1.0.0 + tag v1.0.0（用户定版约定：起点 v0.1.0 / 终点 v1.0.0） |
| v1.3 | RF-P1 验收裁定（952≤1000 达标，归因规划层行数预算误差）；RF-P3b 验收线改为 ≤550+组成校验；三道锁升级四道锁（新增基线锁：派发前规划层核对基线与行数预算） |
| v1.4 | 新增 **RF-Fix1**（聚合语义树化+aiName 同步，插 P2a 后，规则 4/6 用户拍板）与 **RF-P7 设置中心**（登记卡，P6b 后）；收官动作移至 P7 后；总纲补测试交接规则；P2a 验收记录+四项报备备案 |
| v1.5 | Fix1 验收记录（矩阵 8/8+回归修复+electron 字面量裁定 grep=3 接受，commit 2044e3f）；新增 **RF-Fix2**（横板已完成折叠区+子任务计时显示+死声明清理，插 Fix1 后）；P2a 补记缩进差异已消除；P6b 登记过度导出 4 处+usePomodoro import 风格；P3c 盘点范围补 Recent7View/Today 日期函数（审查报告全项闭环） |
| v1.6 | Fix2 验收记录（8/8 PASS+Tasks.tsx 渲染提前落地备案，commit 4f83c9a）；新增 **RF-Fix3**（聚合取消级联+折叠区空心框+done 沉底——**修订 Fix1 规则 1**，用户拍板语义演进）；P2b 范围缩减注记（遗留③已清账）；开工包精益化规则（不重复指读已读文件） |
| v1.7 | Fix3 验收记录（用户手测通过+规划层尽调代提交，commit a744503）；新增 **RF-Fix4 登记槽**（验收 bug 批量修复，P6b 后/收官前，不混 P6b）；P2b 验收线 ≤800→≤850（基线锁重算）+右栏子任务勾选必须走 toggleTaskDone 硬性补注；**流程简化（用户定）**：bug 攒批后置、Fix3 起免独立交付报告评审轮，直接测试会话+手测+授权 commit |
| v1.8 | P2b 验收记录（手动验收，commit 38bafa5，App 841≤850）；**RF-Fix4 池入 9 项**（B1-B4 子任务右栏/计时/检查事项、N1 顺延/N2 看板拖拽、R1-R3 对账待定——R2/R3 疑似 Fix3 已修出卡时核实） |
| v1.9 | P3a 开发/测试/审查完成，手测发现阻塞 bug → **RF-Fix3a 插卡**（诊断先行：取证推翻图片路径假设，真根因=运行时异常/循环 import 候选，Vite overlay 遮罩致"点不动"；禁止 `/assets` 磁盘根绝对路径；审查方法学补丁：搬移审查增查资源/URL 字符串+运行时项）；提交序裁定=P3a 按已审计 diff 先落 commit |
| v1.10 | Fix3a 验收：**零代码改动**（真根因=环境态 HMR/双实例/localStorage 回滚族），三条排障经验入 DEV_RULES §9；P3b 解锁 |
| v1.11 | Fix3a 手测项勘误：「归档折叠」无对应功能区（PRD §3.6 vs 实现缺失）→ Fix4 池新增 N3；Fix4 池现 10 项 |
| v1.12 | P3b 验收记录（三报告通过，App 316 行，commit 66480d2，STRUCTURE 重写入 commit）；审查裁定备案：L2 UI 态切页重置=合理行为变化；P6b 追加登记 3 项（死解构/超 50 行函数/类型偏松） |
| v1.13 | **DEV_RULES §10 视图一致性铁律**（五条款）；新增 **RF-Fix3c 细目卡**（任务系统六组分叉收口：taskTree/taskDelete/taskMeta/taskSort 单点化+TaskCardBase+Popover 等价+看板新建对齐，两段 commit，**待用户确认范围放行**，P3c 暂缓让位）；Fix4 池 R1 转 Fix3c |
| v1.14 | Fix3c-1 验收提交 8ca48e7（审查 0P0/0P1/5P2，utils 九符号唯一+collapsedOf≡isRootAggregated 根集合论证）；**Fix3c-2 重派**：漏交付三件（TaskCardBase/TaskDetailContent/看板三要素）+ 手测三 Bug 入验收清单（Bug1/2 看板聚合分裂=Fix1 级联历史数据残留嫌疑/Bug3 关联点击无反应=close 竞态嫌疑）；Bug4 留 Fix4 |
| v1.15 | Fix3c-2 测试 12/13 过+Bug3 物证驳回（惰性标记无消费）→ 开发补真实修复（closest 守卫在位，规划层复核通过）；**commit 前最终门**：交互审计任务（六类弹层两两交叉+双链矩阵终跑）+ Bug5 弹窗关后菜单滞留修复入卡；子任务独立编辑/检查事项描述编辑确证留 Fix4（池 B1/B4）不阻塞 |
