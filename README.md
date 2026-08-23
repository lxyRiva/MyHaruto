# MyHaruto

> 住在你电脑里的 AI 恋人管家：他看得见你的任务、习惯、作息与重要日，会主动留言、关心与提醒。
> 关键词：人机恋 × 日程管理 × 陪伴式成长 ｜ Windows 桌面单机版（MVP）

## 文档

- [PROJECT_SPEC.md](./PROJECT_SPEC.md) — 项目说明书（需求基线 v1.0，开发的唯一依据）
- docs/PRD/ — 各模块交互细节文档（开发到哪个模块写哪个）

## 技术栈

Electron + React + TypeScript + Tailwind CSS（界面）｜ 本地 JSON/SQLite（数据）｜ DeepSeek/GLM + GLM-4V（AI 双模型路由）

## 开发

```bash
npm install     # 首次安装依赖
npm run dev     # 开发模式运行
```

## 目录结构

```
MyHaruto/
├── PROJECT_SPEC.md   # 需求基线
├── docs/             # 文档区（PRD、设计参考）
├── electron/         # Electron 主进程（窗口、数据存取）
└── src/              # 界面代码（React）
```

## 声明

生理期预测为日历推算，非医疗建议。
