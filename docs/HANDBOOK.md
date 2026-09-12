【文件】HANDBOOK.md
【用途】新人上手——第一次来这项目怎么活
【读】全员
【写】仅规划层
【上游】无（根级入口）
【下游】PROJECT_ROADMAP.md / 各角色 rules
【更新】极少（半年 or 重大架构变化时）
【最后更新】YYYY-MM-DD

# MyHaruto 新 Agent 上手指南

## 一、项目一句话
人机恋 × 日程管理 × 陪伴成长的 Windows 桌面单机 App。

## 二、去哪找导航
→ 见 PROJECT_ROADMAP.md（项目路线图：M 阶段 + 卡清单）
本文件不重复路线图内容。

## 三、各角色上手路径（先看我怎么走）
- 开发会话：
  HANDBOOK → PROJECT_ROADMAP → AGENT_STATE → 当前卡 → DEV_RULES → 开工
- 测试/审查会话：
  HANDBOOK → PROJECT_ROADMAP → AGENT_STATE → 当前卡 → TEST_REVIEW_RULES → 开工
- 规划会话：
  HANDBOOK → PROJECT_ROADMAP → VERSION_MIGRATION_v1 → AGENT_STATE
  → CARD_PROTOCOL → PLANNER_RULES → 开工
- 用户：
  HANDBOOK → WORKFLOW_SOP.md

## 四、必读文件（就这几份，其他不用读）
1. PROJECT_ROADMAP.md — 去哪（导航）
2. CARD_PROTOCOL.md — 卡怎么管（规则）
3. 本角色 rules：
   - 开发 → DEV_RULES.md
   - 测试/审查 → TEST_REVIEW_RULES.md
   - 规划 → PLANNER_RULES.md
4. AGENT_STATE.md — 现在在哪（状态）
5. 当前卡文件 — 做什么（执行）

## 五、读后回执机制（必须）
开工第一次读完上列文件后，在开工消息里回执一次：
「已读：[HANDBOOK] [PROJECT_ROADMAP] [AGENT_STATE] [当前卡 M2-V13]
当前卡任务：T1-T5
当前状态：T5 未完成
开工。」

回执一次即可。本会话后续不再重读全文。

## 六、记忆保持机制（会话内）
- 会话内：读完 + 回执后，本会话不再重复读全文。
  需要引用时只引用段落编号，如「按 DEV_RULES §2 数据访问」。
- 上下文丢失时：如出现以下信号，重读关键文件（DEV_RULES / CARD_PROTOCOL）：
  - 对话超过 30 轮
  - 用户明确说"重新读"
  - 自己感觉规则记不清了
- 跨会话：新会话必须重新读（上下文独立）。

## 七、跑起来
```bash
cd /d D:\Software\Zcode_appdata\.zcode\workspace\default\MyHaruto
npm install    # 如 node_modules 不存在
npm run dev    # 开发模式
```
