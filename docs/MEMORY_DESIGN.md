【文件】MEMORY_DESIGN.md
【用途】记忆库架构设计——⚠️ 骨架占位，待 M5 后定稿
【读】规划层、M5/M6 开发者
【写】仅规划层
【上游】PROJECT_ROADMAP.md
【下游】TECH.md §3.4
【更新】M5技术握手后填充，由规划层agent提醒用户进行更新
【最后更新】2026-09-13

# 记忆库架构设计（骨架）

⚠️ **本文件为骨架占位。** 记忆库的完整架构在 **M5（AI 聊天 + 视觉 + 人物主页 + 记忆库骨架）** 定稿。本骨架只登记已定方向与待定问题，不写死细节。

## 1. 已定方向

- **统一消息模型**：Haruto 留言/对话统一存 `data/ai/chat-messages.json`，每条带 `sourceType`（chat/task/importantDay/period/town）
- **记忆库唯一提取源**：只从 chat-messages.json 提取
- **数据隔离**：仓库内 `data/ai/` 只放空模板，用户实体数据在 `%APPDATA%`

## 2. 待 M5 讨论的问题

- 碎片事实（fragments）/ 聚合叙事（episodes）/ 实体画像（entity-profiles）/ 长期弧线（sagas）的数据结构
- 记忆提取时机（实时 / 定时 / 事件触发）
- 检索机制（按实体标签 / 按时间 / 按主题）
- 印象演化链（impressions.json）如何更新
- 念头池（thoughts.json）如何生成与消费
- 与角色动画的联动（记忆触发动作？——与 M7 联合）

## 3. 相关文件

- AI 数据域：TECH.md §3.4
- 数据目录：DATA_LAYOUT.md
- 角色动画：CHARACTER_ANIMATION.md
