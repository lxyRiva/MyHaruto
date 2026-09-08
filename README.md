# MyHaruto

> 住在你电脑里的 AI 恋人管家：他看得见你的任务、习惯、作息与重要日，会主动留言、关心与提醒。
> 关键词：人机恋 × 日程管理 × 陪伴式成长 ｜ Windows 桌面单机版

## 快速导航

| 文档 | 内容 | 给谁看 |
|---|---|---|
| [docs/HANDBOOK.md](./docs/HANDBOOK.md) | **新 Agent/开发者上手指南**（六步接管） | 接手开发的人 |
| [docs/PRD.md](./docs/PRD.md) | 产品需求文档：定位/布局/全模块功能规格/视觉规范 | 所有人（功能权威） |
| [docs/TECH.md](./docs/TECH.md) | 技术文档：栈/数据模型/关键机制/开发铁律 | 开发者 |
| [docs/STRUCTURE.md](./docs/STRUCTURE.md) | 项目文件结构地图 | 开发者 |
| [CONTINUE.md](./CONTINUE.md) | 新会话接力卡（复制即用） | AI 会话 |
| [PROJECT_SPEC.md](./PROJECT_SPEC.md) | 需求基线 v1.0（历史存档） | 考古 |

## 技术栈

Electron + React + TypeScript + Tailwind CSS ｜ ECharts + solarlunar ｜ 数据全本地（%APPDATA%/MyHaruto/data/db.json）

## 运行

```bash
npm install     # 首次安装依赖
npm run dev     # 开发模式（热更新）
npm run build   # 打包界面到 dist/
```

## 任务双视图设计

- **横板视图**（今天/最近7天/全部）= 时间维度：按日期分组（已逾期/今天/未来日期），回答「我今天要干什么，什么最紧急」
- **看板视图**（清单/标签）= 项目进展维度：按分组（Section）组织，每个分组是一个项目/阶段，回答「每个项目推进到哪了，完成度如何」
- 两视图排序共用同一套逻辑（优先级优先，同优先级内按时间），业务规则单一实现（视图一致性铁律）

## 数据与隐私

- 数据全本地：用户数据存 `%APPDATA%/MyHaruto/data/`，**永不上传**；仓库内 `data/` 只含空模板与默认人设
- 任务双视图、AI 消息统一模型、角色渲染解耦等设计细节见 [docs/PRD.md](./docs/PRD.md)

## 声明

生理期预测为日历推算，非医疗建议。
