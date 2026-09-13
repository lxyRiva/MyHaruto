【文件】DEV_RULES.md
【用途】开发铁律
【读】开发、测试、规划
【写】仅规划层
【上游】CARD_PROTOCOL.md
【下游】无
【更新】规则变化时
【最后更新】2026-09-13

# MyHaruto 开发铁律（全 Agent 必读）
> 违反任何一条，审查 Agent 直接打回，不进验收。

## 1. 目录与依赖
- 功能代码入 src/features/<域>/（components/hooks/utils/types），应用壳 src/app/，
  跨域共享 src/shared/，数据访问 src/data/。
- features 之间禁止 import 对方内部文件。要复用：升 shared/，或经 App props 下发，
  或从对方 index.ts 显式导出并登记到本文件白名单（当前白名单：空）。
- hooks 只放状态与逻辑；纯展示组件不碰 db/handler，数据全走 props。

## 2. 数据访问
- 数据操作一律走 src/data/repository.ts，组件与 hooks 禁直接 IPC。
- localStorage 仅经 shared/hooks/useLocalStorage，key 前缀 mh-，展示态不入库。
  现有 key：mh-detail-panel-width、mh-year-target-{id}、mh-day-style-{id}、
  mh-day-repeat-{id}、mh-day-pinned-{id}、mh-day-lunar-{id}、mh-sidebar
  （注意模板串写法，开发时 grep 复核补全）。
- 加字段铁律：Task/Db 新字段必须同时给 default 值 + 主进程自愈兜底，旧数据 undefined 即默认。
- **数据根解析约定（2026-09-09，RF-Data 加固后强制）**：用户数据根=`%APPDATA%/MyHaruto/config.json`
  的 dataDir（可自定义），**默认根下可能存在迁移残留副本，不是活数据**。任何脚本/测试/排查读用户数据
  前必须先读 config.json 解析 dataRoot，禁止硬编码 `%APPDATA%/MyHaruto/data`；渲染端一律走 repository，
  主进程一律走 store.js 的 resolveRoot()。

## 3. 代码规模
- 新文件 ≤500 行、新函数 ≤50 行。存量超标文件（ImportantDays/Habits 等）
  不做全量补课，动到时顺手拆。
- 例外：3D 组件、ECharts 配置类文件超限须报告规划层批准。
- 同样逻辑出现 ≥3 处必须提 shared/utils；日期一律 shared/utils/date.ts（P3c 落地后）。

## 4. 禁令
- window.prompt/alert/confirm（Electron 静默失效）：编辑=行内 input，确认=居中 modal，
  菜单=FloatingMenu。
- UI 层禁 emoji（用户数据除外：习惯 icon、H2 标签 emoji）；图标加 icons.tsx。
- 禁新增 npm 依赖（例外须用户批准）；禁改 vite 端口 5173/strictPort。
  **已批准例外（2026-09-09 用户批）**：`three` + `@react-three/fiber`（RF-Town-MVP 3D 角色展示）；
  `@react-three/drei` 待技术文档定稿后另行申请。
- 左键=详情、右键=菜单，任何层级任务不许分叉。

## 5. 质量与提交
- 三关：tsc --noEmit 零错误 → npm run build 成功 → 用户验收 → commit；push 需授权。
- **红线（2026-09-11 用户令）**：任何 git add / commit / push 必须用户**明确说"批准"或"commit"**才能执行。"读回执""文件已保存""贴 diff""贴状态"都不等于批准。每次 git 操作前，规划层先回执：「准备执行：[add/commit/push] [文件列表] [message]，是否批准？」收到"批准"后才能执行。违反=红线。
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
- 置顶双标记：isPinnedGroup（看板读）+ isPinnedToday（横板读），两者独立
- positionDateOf：横板组位置唯一实现（groupPosition.ts）
- taskSort：排序唯一实现（含 pinnedGroupFirst 内聚预排）

## 8. Agent 会话边界（2026-09-06 起强制）
- 开发/测试/审查必须各开独立会话，禁止同会话兼任多角色。
- 测试会话只跑验收清单、出测试报告，禁止修改任何代码；发现问题回报，由开发会话修复。
- 审查会话开工第一条消息必须显式声明「切换为审查模式」，全程只读代码与 diff，不改文件。
- 规划会话只出卡不改码。各角色通过 CONTINUE.md 接力，每卡收尾更新为下一卡状态。

## 9. 运行期环境禁令（2026-09-06 RF-Fix3a 后登记，源自真实排障）
- 禁止 taskkill //F 强杀 MyHaruto：打断 localStorage（Chromium LevelDB）写盘会导致标记回滚。关应用走正常关闭。
- 禁止同时开两个 MyHaruto 实例：后开实例的 localStorage 内存化不保存。
- dev（localhost:5173）与生产（file://dist）的 localStorage 按 origin 隔离，设置不互通是正常行为，不是 bug。
- 症状诡异（白屏/点不动/状态丢失）先全新启动排除 HMR 坏窗与双实例，再查代码（ELECTRON_ENABLE_LOGGING=1 收渲染进程 console）。

## 10. 视图一致性铁律（2026-09-06 立，源自 Fix3c 深度比对）
- 任何跨视图共享的业务规则（勾选/折叠/聚合/排序/meta显示/删除/检查事项/默认模式判断），必须在 features/<域>/utils/ 下有且仅有一个实现。
- 视图组件（横板/看板/弹窗/右栏）只做布局适配，禁止复制业务逻辑。
- 新功能涉及多个视图时，规划层必须先做"逻辑链比对"，确认不会产生第二份实现。
- 审查 Agent 常规审查项增加：共享函数全库唯一性 grep 验证（每个 utils 函数全库仅 1 个定义点，除测试外无重复实现）。
- 修改业务规则时，只改 utils/ 一处；禁止在视图组件内"顺手改"。
- **双视图产品定位（2026-09-08 定稿）**：横板（今天/最近7天/全部）=时间维度，看板（H1/H2）=项目进展维度；两视图共享同一套任务数据，只是展现维度不同，排序共用同一套（taskSort 单一实现），分组语义各自独立但不得私设第二套排序/勾选/聚合规则。
- **排序维度链（2026-09-08 定稿，Fix4 实施）**：优先级 > 日期时间 > 创建时间（高优先级+无日期 排在 低优先级+今天到期 之前）；现行 taskSort 仍为日期优先，Fix4 P2 改维度链时横看一次到位，逾期组本地比较器一并收编。
- **施工前反问（2026-09-09，RF-B1 Recent7 漏接事故）**：开发拿到卡后必须先回答「这个语义的全消费面是什么」——逐视图枚举核对；发现卡漏（规格漏列某视图/消费点）立即上报规划层，**禁止照卡盲做**。
- **接口重构回归（2026-09-09）**：任何接口签名/返回结构变更，必须回归该接口**所有既有消费点**的验收，不接受只测新入口。
- **附则**：规格撰写禁用"横板/看板"等集合词转写视图清单（须逐个列名）——本条意图已被"施工前反问"覆盖，降为附则。
- **卡文件 commit 铁律**：每次改卡必须 commit，message 格式 card(<卡名>): <简述>
- **状态行 5 要素**：状态词 · 版本号 · 轮次 · commit · 证据，缺一无效

## 11. 工作区边界（2026-09-09 用户令，全程有效）
- 所有 Agent 会话的工作目录固定为 `D:\Software\Zcode_appdata` 与 `D:\Software\Zcode` 两个目录树。
- 禁止在本地搜索或读写上述两目录之外的任何路径（含系统目录、其他盘符、用户目录）。
  唯一例外：应用自身运行数据的读写按数据层设计走 `%APPDATA%/MyHaruto/`（config.json/data/）。
- 需要引用外部目录的文件（如美术资产源文件）时：先向用户报告完整路径并征得同意，禁止直接 find/ls 试探。
- 允许联网（npm 安装、GitHub 推送、GitHub Releases API 等）。
- 用户本地归档目录 `E:\MyHarutoArchive\` 为例外。

## 12. 卡管理规约

- 卡文件位置：`docs/cards/`
- 卡命名：`M阶段-V序号-卡名.md`（如 M2-V13-*.md）
- 卡结构：卡头 6 行 + 当前有效指令 + 迭代日志 + 冻结规则（详见 CARD_PROTOCOL）
- 状态更新：仅规划层可写，开发/测试只读
- git 提醒：卡手测通过后，规划层主动问用户"是否 commit"
- 归档：卡全部 commit + push + tag 后，用户复制到本地归档，规划层从项目树删除

## 13. 3D 资产规约
- 出厂资产：`public/builtin-art/town/`（随代码发布）
- 用户自定义：用户数据目录 `my-art/town/`（覆盖默认，其位置应该在用户数据自定义存储的位置）
- 读取优先级：`my-art/` > `builtin-art/`
- 模型格式：.glb / .gltf
- 渲染解耦：CharacterStage 组件 + character-state.json（M2.5 待定，后续可能更改）
- 技术栈：three + @react-three/fiber（§4 例外，待定，M2.5确定后更新此条）
