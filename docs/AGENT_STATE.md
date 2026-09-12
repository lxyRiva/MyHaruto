# AGENT_STATE — 当前状态速览（新会话第一句读我；规划层每阶段收尾更新，≤50 行）

## 项目与锚点（2026-09-10 快照）
MyHaruto（Electron+React18+TS strict+Tailwind）重构线。HEAD=bda613b（docs v1.40）；
工作区=RF-B1 收尾阶段 2 施工中 WIP 17 项（16M+groupPosition.ts）——**接力会话直接续作勿重做**。
tag：v0.1.0=refactor-start=7b4978f、fix3c-pre=88907d3｜全部已推送。

## 进度
✅ P1~P3c/Fix1-3/3a/3c(1+2)/RF-Data(1-3)/RF-Polish-P1~P6 ｜ ⏳ **RF-B1 收尾阶段 2 补测+T1 Toast 施工中（执行卡 v3.2+批复修正）**
→ 之后：RF-B1 闭环 → RF-Polish 旧池 → RF-Clean → RF-H1 → RF-Town-MVP → RF-Moments → RF-Release → v1.0.0

## 会话分工（单线+身份纯净）
- 规划（本会话）：出卡/串行 commit/盯门；**永不代跑测试/运行验证**
- 开发会话：RF-B1 收尾阶段 2（执行卡 v3.2=总集 v1.40 后的现行版）
- 测试+审查：合并单会话，按 v3 证据标准（截图/录屏+反例）复核

## RF-B1 收尾核心语义（详见总集「十九」+「十八D」）
- 置顶该组（isPinnedGroup）：写**直接父任务**标记（三层同理）；看板父组浮首；横板不读
- 置顶今天（isPinnedToday）：双入口写标记+日期=今天；子任务取消回设直接父日期；父任务取消仅清标记；手动改日期自动清（updateTask 守卫）
- A4 组单点：组位置=最近未过期日期（父参与+未完成子参与+已完成跳过）；groupPosition 方案甲=纯 positionDate
- A2/A3：核对式（已实点通过，核对未被覆盖）

## 铁律速查（违反=打回）
- 停手不 commit 不 add；冲突/卡与实际不符→停手回报规划层
- 施工前反问：先答全消费面再动码；发现卡漏先上报禁盲做
- 接口重构：回归所有既有消费点；批量替换后 Read 整段复核
- 承诺必须同次落盘自查（认领≠落地——已两起）
- 第零步清场：按端口清 vite 孤儿+electron 优雅退出禁 taskkill；禁双开
- 工作区边界 §11：两目录树外禁搜索读写（%APPDATA%/MyHaruto 数据例外）；数据读取先读 config.json（默认根有迁移残留非活数据）

## 下一步
开发补交报告（含横板反例截图/手测清单/真实原因+T1 Toast）→ 测试合并会话 → 用户手测 → 授权 → 规划层串行 commit → RF-B1 闭环 → RF-Polish 旧池
