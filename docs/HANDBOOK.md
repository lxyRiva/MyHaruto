# MyHaruto 新 Agent 上手指南（HANDBOOK）

> 你（新 Agent/开发者）接手的是一个已完成 M1-M4、正待开发 M5（AI 灵魂）的 Windows 桌面应用。
> 按以下六步走，20 分钟进入战斗状态。

## 六步上手

**第1步·读文档（按序）**
1. `docs/PRD.md` —— 产品是什么、每个功能长什么样（权威功能规格）
2. `docs/TECH.md` —— 怎么跑、数据在哪、关键机制、开发铁律
3. `docs/STRUCTURE.md` —— 每个文件是干嘛的
4. `PROJECT_SPEC.md` —— 需求基线（历史存档，冲突以 PRD.md 为准）

**第2步·跑起来**
```bash
cd /d D:\Software\Zcode_appdata\.zcode\workspace\default\MyHaruto
npm install        # 如果 node_modules 不存在
npm run dev        # 开发模式，改代码热更新
```

**第3步·明确本次任务**：产品主人会在对话里给出目标（如"开发 M5 聊天页"）。**有歧义先问清再动手**——本项目曾因理解偏差返工多轮。提问要具体到"是/否"或选项。

**第4步·开发**
- 改哪个文件看 STRUCTURE.md 的职责划分；**App.tsx 和 Today.tsx 是热区**，动它们要整读再改
- 遵守 TECH.md「开发铁律」六条（tsc 三关 / D盘路径 / 禁 prompt / 左右键规范 / 禁 emoji / 文件边界）

**第5步·验证+提交**
```bash
"C:\Program Files\nodejs\node.exe" node_modules\typescript\bin\tsc --noEmit   # 零错误
npm run build                                                                 # 成功
git add -A && git commit -m "feat: 一句话说清改了什么"
```

**第6步·交验**：`npm run build` 后用 `node_modules\electron\dist\electron.exe .`（或桌面快捷方式）打开给产品主人验收。**改一个验一个**，不攒批。

## 协作规范（与产品主人）

- 她是纯小白+强执行力：解释用大白话+比喻，代码细节不必展开，但**改动清单必须说清**
- 她会高强度验收并给编号问题清单：逐条对齐理解再修（多轮提问确认），不许自以为懂
- 审美要求高：极简 Loft 风、微动效、拒绝丑和毛坯感；设计稿由 workbuddy 出（D:\Software\WorkBuddy生成存储\）
- 验收节奏：改一个→她验一个→git 提交一次

## 当前挂起事项（接手先看）

1. **M5 AI 聊天**（下一仗）：需要产品主人注册智谱 API Key（open.bigmodel.cn）；设计稿任务2/3（聊天页/人物主页）workbuddy 生成中；实现规格见 PRD.md §3.7
2. **GitHub 推送**：本地 16+ 提交已就绪，推送受网络阻断（Connection was reset）——主人有梯子/热点时在 GitHub Desktop 点 Push origin 即可（仓库已存在：github.com/WillaLin-ux/MyHaruto，私有）
3. 次要遗留：番茄专注页重开按钮的"同参数重启"在正计时模式语义待定；习惯每月/每周/每天重复仅 UI 未入 types；重要日按农历每年重复的公历换算提醒未做
