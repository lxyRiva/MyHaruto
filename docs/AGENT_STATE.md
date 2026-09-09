# AGENT_STATE — 当前状态速览（新会话第一句话读我；规划层每阶段收尾更新，≤50 行）

## 项目与锚点
MyHaruto（Electron+React18+TS strict+Tailwind）重构线进行中。
HEAD=cbc8c3d（RF-Data+RF-Polish 六笔已推送）｜工作区干净｜tag：v0.1.0=refactor-start=7b4978f、fix3c-pre=88907d3

## 重构进度（总集 docs/REFACTOR_CARDS.md v1.25）
✅ P1/P2a/P2b/P3a/P3b/P3c/Fix1/2/3/3a/3c(1+2)/RF-Data(1-3)/RF-Polish-P1~P6 ｜ ⏳ 单线待派：RF-Moments（细案待批）
→ RF-Moments/RF-Clean/RF-Polish旧池/RF-Release/v1.0.0
（命名映射：P6b=RF-Clean，Fix4=RF-Polish，P7=RF-Release；Fix4-P1~P6=RF-Polish 线 B 并行中）

## 当前会话分工（双线并行期）
- 规划（本会话）：出卡/串行 commit/盯门；每阶段收尾更新本文件
- 开发 Agent 1：RF-Data 三笔已交付（39692f3/09d97ae/7f0ff27）；下一卡 RF-Moments 待批
- 开发 Agent 2：RF-Polish-P 序列已交付（c8b0208）；待命
- 测试+审查：合并单会话（测试→审查→一份合并报告）
- ⚠️ 双线模式已废弃（2026-09-09 用户终审），严格单线串行
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
派 RF-B1（低风险档：开发→手测→commit）；RF-Moments 细案待用户批；RF-Town-MVP 房间背景资产缺口（默认 CSS 占位）
## 节俭令（2026-09-09）
报告四项制（清单/diff摘要3-5行/✅❌/遗留）不贴代码；测试三件套；审查仅搬移迁移类；非阻塞 bug 进池

## ⚠️ 撤退令（2026-09-09 用户终审）：双线废弃，回归严格单线串行
线 B 已落 c8b0208（RF-Polish P1-P6）暂停；线 A 唯一在册（修 RF-Data-2 P0 首启选位返回值丢弃@electron/data/store.js initStore db:get → 重跑项 1 两分支 → 分层重建 Data-1/2/3 三笔）；工作区剩余=纯 A 改动。今后所有卡：开发→测试→审查(仅搬移/迁移)→手测→commit→下一卡
