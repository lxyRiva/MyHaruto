# 留言对话模型（基线 v1 · 2026-09-09 从设计会话提取）

> 类型锚点：src/shared/types.ts 的 ChatMessage/ChatSource（已预落）。

## 统一消息模型
Haruto 的留言 = 聊天记录的一部分，**统一存 data/ai/chat-messages.json**，时间线唯一：
`{ id, role:'user'|'haruto', content, imagePath?, sourceType:'chat'|'task'|'importantDay'|'period'|'town', createdAt }`

## sourceType 语义
| 值 | 场景 | 展示位置 |
|---|---|---|
| chat | 聊天页对话 | 聊天页气泡 |
| task | 读任务后的留言（海蓝斜体双引号，只读+追加） | 任务详情留言区 |
| importantDay | 重要日提醒 | 重要日/聊天 |
| period | 生理期关怀 | 聊天 |
| town | 小镇陪伴 | TownPage/聊天 |

## 权限与展示
- AI 对任务数据只读；唯一写权限=追加留言进 chat-messages（永不删改用户数据）。
- 历史兼容：Task.taskComments（旧表）保留展示；新留言一律走 chat-messages（sourceType='task'），双读策略 M5 细案定稿。

## 待定（M5 细案）
聊天页 UI 分页、留言触达提醒（红点/气泡/轻提示音）、双模型路由（带图→视觉）。
