【版本=C2.1｜取代=无｜生效=是｜其他版本一律作废】
【本卡=RF-B1 补交 C2：ListTaskCard:8 死 import 删（独立小卡）】
【改动=新 Agent 三任务之二：删 pinnedGroupFirst 死 import】
【状态】待开工 · 2026-09-11 · commit=无 · 证据=无（死 import 删归第二笔 fix）

你是 MyHaruto 的【开发会话】，执行 RF-B1 补交 C2（死 import 删）。
任务 2 详版，独立可执行。

一、开工锁：pwd / git log -1 / git status --short（现场实测贴原文；
   快照=51f78f0 附近，以实测为准）；node_modules 存在。

二、任务内容
- ListTaskCard.tsx:8 行：
  import { pinnedGroupFirst, taskSort } from '../utils/taskSort'
  中 pinnedGroupFirst 已无消费（children 已是纯 sort(taskSort)），
  改为 import { taskSort } from '../utils/taskSort'
- 删后 npx tsc --noEmit 确认零错误（若报 unused 相关反而说明删对了）

三、禁止事项
- 禁止 commit/push（未验收前）
- 禁止顺手改其他内容（本卡只删此一处 import）

四、验收标准
1. tsc 零错误。反例：报错=失败
2. grep pinnedGroupFirst ListTaskCard.tsx 零命中。反例：残留=失败

五、报告格式（两段制：已实点+证据 / 未完成+清单）

六、差异说明（3-5 行）：单行 import 修改，无其他变化
