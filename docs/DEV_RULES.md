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
