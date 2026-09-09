# AGENT_STATE — 当前状态速览（新会话第一句话读我；规划层每阶段收尾更新，≤50 行）

## 项目与锚点
MyHaruto（Electron+React18+TS strict+Tailwind）重构线进行中。
HEAD=6d9567b（P3c 已推送）｜工作区干净｜tag：v0.1.0=refactor-start=7b4978f、fix3c-pre=88907d3

## 重构进度（总集 docs/REFACTOR_CARDS.md v1.23）
✅ P1/P2a/P2b/P3a/P3b/P3c/Fix1/2/3/3a/3c(1+2) ｜ ⏳ **双线第二波进行中**
→ RF-Moments/RF-Clean/RF-Polish旧池/RF-Release/v1.0.0
（命名映射：P6b=RF-Clean，Fix4=RF-Polish，P7=RF-Release；Fix4-P1~P6=RF-Polish 线 B 并行中）

## 当前会话分工（双线并行期）
- 规划（本会话）：出卡/串行 commit/盯门；每阶段收尾更新本文件
- 开发 Agent 1（线 A）：RF-Data 三 commit 一次跑全卡（repository/多文件化/书影旅游模型占位）
- 开发 Agent 2（线 B）：RF-Polish-P1→P6 视图批量（原开工包生效，开工锁重跑）
- 测试+审查：合并单会话（测试→审查→一份合并报告）
- 测试/审查：按分级验收表召唤

## 分级验收（2026-09-08 定）
高风险（P4/P5）：开发→测试→审查→手测→commit
中风险（P6a/P6b）：开发→测试→手测→commit（免审查）
低风险（小修补）：开发→手测→commit（免测试审查）← P3c 修补适用

## 双线纪律
- 开发只改文件，禁 git add/commit；规划层按核定清单精确 add 串行落 commit
- 文件域：线 A=electron/src.data/App数据useEffect/SettingsModal；线 B=features/tasks/**
- dev 窗口令牌制：实测前排他占用，用完优雅退出；开工前杀净旧实例禁双开
- 冲突/卡与实际不符：停手回报规划层，禁现场变通

## 三关（每卡必过）
tsc --noEmit 零错误 → npm run build → npm run dev 自测

## 下一步
双线并行中：线 A 交 RF-Data 合并报告（测试+审查合并会话验）→ 手测 → 三笔授权 commit
线 B 交 RF-Polish-P 序列报告 → 手测 → commit；两线 commit 由规划层串行落
shared/types.ts=共享热区：两线都只做追加式修改
## 节俭令（2026-09-09）
报告四项制（清单/diff摘要3-5行/✅❌/遗留）不贴代码；测试三件套；审查仅搬移迁移类；非阻塞 bug 进池
