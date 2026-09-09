# AGENT_STATE — 当前状态速览（新会话第一句话读我；规划层每阶段收尾更新，≤50 行）

## 项目与锚点
MyHaruto（Electron+React18+TS strict+Tailwind）重构线进行中。
HEAD=af5b552（v1.20 docs）｜工作区=P3c 修补未提交｜tag：v0.1.0=refactor-start=7b4978f、fix3c-pre=88907d3｜未 push 笔数 4

## 重构进度（总集 docs/REFACTOR_CARDS.md v1.21）
✅ P1/P2a/P2b/P3a/P3b/Fix1/2/3/3a/3c(1+2) ｜ ⏳ P3c 修补中 → 双线第二波 → P6a/P6b/Fix4旧池/P7/v1.0.0

## 当前会话分工（双线并行期）
- 规划（本会话）：出卡/串行 commit/盯门；每阶段收尾更新本文件
- 开发 Agent 1（线 A）：P3c 修补（detailWidth 单点）→ P4→P5 数据链
- 开发 Agent 2（线 B）：停手待命，P3c commit 后立即开工 Fix4-P1→P6 视图批量
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
P3c 修补交付→手测→commit→双线铺开（线A开工包+线B原包即时生效）
P6a 细案规格 v1 已在总集「十、RF-P6a」，待用户批
