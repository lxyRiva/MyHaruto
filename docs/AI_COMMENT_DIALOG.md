【文件】AI_COMMENT_DIALOG.md
【用途】Haruto 留言/对话消息模型（M5 实现依据）
【读】规划层、M5/M6 开发者
【写】仅规划层
【上游】PRD.md §3.7
【下游】MEMORY_DESIGN.md
【更新】消息模型变化时，规划agent主动提醒询问是否更新
【最后更新】2026-09-13

# Haruto 留言/对话消息模型

## 1. 设计原则

**留言与对话统一时间线**——Haruto 的所有输出（主动留言、对话回复、定时行为）都是"消息"，只是触发来源不同。

**记忆库唯一提取源**——记忆提取只从 `chat-messages.json` 读，不从其他地方捞。

## 2. 消息数据结构

统一存 `data/ai/chat-messages.json`（数组）：

```
ChatMessage {
  id: string
  role: 'haruto' | 'user'
  content: string
  imagePath?: string              # 用户发图或 Haruto 引用图
  sourceType: 'chat' | 'task' | 'importantDay' | 'period' | 'town'
  createdAt: ISO string
}
```

### sourceType 说明

| sourceType | 含义 | 触发方 |
|---|---|---|
| `chat` | 用户与 Haruto 的直接对话 | 用户 / AI |
| `task` | 针对任务的留言（如"今天要做 XX 哦"） | M6 定时行为 |
| `importantDay` | 重要日提醒 | M6 |
| `period` | 生理期关心 | M6 |
| `town` | 小镇陪伴场景中的对话 | M7 |

## 3. 消息展示

- **聊天页**：按 createdAt 正序，haruto 左 / user 右，气泡式
- **留言卡片**：横板/看板的任务卡上，以"海蓝斜体双引号"样式显示最近一条 task 类型留言
- **人物主页**：显示"当前情绪"（从最新消息推断）

## 4. 消息写入时机

| 场景 | 写入时机 |
|---|---|
| 用户发送消息 | 即时 |
| Haruto 回复 | AI 返回后 |
| M6 定时行为 | 定时触发时 |
| 任务相关留言 | 每天 2 次（配置） |

## 5. 记忆库接口（预留）

`data/repository.ts` 预留签名（M6 实现）：

```
appendFragment(text, entities)              # 追加碎片事实
updateEntityProfile(entityId, delta)        # 更新实体画像
getMemoriesForChat(context)                 # 检索相关记忆
```

**M5 不实现，只留口子。**

## 6. 与其他文件的关系

- 消息模型 = PRD §3.7 的实现依据
- 记忆库 = MEMORY_DESIGN.md
- 数据目录 = DATA_LAYOUT.md（`ai/` 域）

## 7. 待 M2.5 后定稿

- Haruto 的回复风格与情绪表达如何映射到消息
- 消息与角色动画的联动（何时触发 talking / idle）
- 图片识别后的消息格式扩展
