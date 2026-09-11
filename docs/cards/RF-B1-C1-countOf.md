【版本=C1.1｜取代=无｜生效=是｜其他版本一律作废】
【本卡=RF-B1 补交 C1：countOf 口径落码（独立小卡）】
【改动=新 Agent 三任务之一：countOf 共源落码+tooltip+附带清点】
【状态】待开工 · 2026-09-11 · commit=无 · 证据=无（countOf 落码归第二笔 fix）

你是 MyHaruto 的【开发会话】，执行 RF-B1 补交 C1（countOf 口径落码）。
任务 1 详版（结构性要求·最核心），独立可执行。

一、开工锁：pwd / git log -1 / git status --short（现场实测贴原文；
   快照=51f78f0 附近，以实测为准）；node_modules 存在。

二、任务内容
1. useTaskSelectors 新增 todayRoots useMemo（组位置=today 的根任务集
   [不含折叠区已完成根卡]，调 positionDateOf；today 进 useMemo 依赖
   数组与否，报告明说——跨零点重算依赖此）
2. countOf('today')=todayRoots.length（组卡数，每父卡计 1）——
   唯一口径禁第二定义
3. 折叠判定写死：折叠区成员=根任务 done 且 root.aggregated；
   子任务自己 done、父任务未聚合 → 不算折叠，仍计入
4. tooltip（N/M 明文）：「今天 N 个任务（含子任务 M 条）」——
   N=countOf('today')（组卡数）；M=今天区全部后代任务数（含已完成）
5. L2Sidebar「今天」数字旁加 tooltip（title 属性实时值）
6. 附带清点：grep countOf 其他分支（'all'/tagId）旧 isPinnedToday
   残留——先列报告，不擅自改
7. todayRoots 依赖链报告三项：today 来源/today 是否进依赖数组/
   跨零点 L2 与 Today 是否同步刷新

三、禁止事项
- 禁止 countOf 独立调 positionDateOf（必须复用 Today 页同一
  todayRoots 结果）
- 禁止 commit/push（未验收前）
- 禁止照卡盲做（发现卡漏先上报）

四、验收标准
1. countOf 口径=甲（卡片数）：L2 计数=Today 页今天区显示一致。
   反例：L2 计数≠今天区根卡数=失败
2. tooltip 双信息实显：N=组卡数、M=区内条目数。反例：与口径不符=失败
3. 跨零点行为报告明说。反例：未报告=失败

五、报告格式（两段制：已实点+证据 / 未完成+清单）

六、差异说明（3-5 行）：相对上轮打回版=改用 Today 页同一 todayRoots
   结果（结构性修复），tooltip 双信息，折叠判定写死
