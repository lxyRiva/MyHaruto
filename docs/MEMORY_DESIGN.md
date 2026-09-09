# 记忆库架构（基线 v1 · 2026-09-09 从设计会话提取；M6 实现）

> 状态：基线已定，本文档为骨架+已证内容；实现细节随 M6 细化。
> 类型锚点：src/shared/types.ts 的 MemoryFragment/EntityProfile/UserModel/Thought/Impression（已预落）。

## 三层记忆（data/ai/memories/）
| 层 | 文件 | 内容 | 演进 |
|---|---|---|---|
| 碎片层 | fragments.json | MemoryFragment[]——对话/事件原子记忆，带 category/emotionWeight/activationScore | Sagas 滚动摘要的原料 |
| 情节层 | episodes.json | 连续事件聚合（同场景多碎片成段） | M6 细化 |
| 实体层 | entity-profiles.json | EntityProfile[]——person/thing/concept 画像，fragmentIds 硬关联碎片 | entityTag 映射更新 |

## 核心机制
- **唯一提取源**：data/ai/chat-messages.json（统一时间线，sourceType 五类）；记忆库只从这里提取，不散落读取。
- **entityTag（实体标签硬关联）**：碎片→实体画像的关联靠标签匹配（utils/entityTag.ts，M6）。
- **memoryCondense（滚动摘要 / Sagas）**：碎片按 activationScore 衰减（频率×新近度×情绪权重），低分碎片被摘要进 episodes/实体画像（utils/memoryCondense.ts，M6）。
- **写入口**：hooks/useMemoryWrite；**读取口**：hooks/useMemoryRecall（M6 实现，repository 签名届时落）。
- **陪伴口子**：RF-Town-MVP 的 data/town/activity-log.json（陪伴事件）为 M6 记忆提取的第二个数据源（已预留）。

## 待定（M6 细案）
episodes 结构、衰减公式参数、检索排序、与 persona 的互相影响。
