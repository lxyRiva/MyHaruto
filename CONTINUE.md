# 开发接力卡（新会话必读）

> 用法：每次开新的 AI 编程会话（zcode / DeepSeek / 任何 Agent），把下面分隔线之间的话
> 复制粘贴作为第一条消息，AI 就能接上进度。【】里的内容按实际填写。

---

我在开发 MyHaruto（AI 恋人日程管理软件，Windows 桌面端，Electron+React+TS+Tailwind）。

1. 先按顺序读文档：docs/HANDBOOK.md（上手指南）→ docs/PRD.md（功能规格）→ docs/TECH.md（技术机制与铁律）→ docs/STRUCTURE.md（文件地图）。PRD.md 是功能权威。
2. 项目在 D:\Software\Zcode_appdata\.zcode\workspace\default\MyHaruto（构建必须走 D 盘路径）。运行：npm install（首次）→ npm run dev。
3. 当前进度：M1-M4 已完成（三层布局/无限嵌套任务树/专注计时/月历周月视图/习惯周月年/统计三图表/重要日农历插画卡片/生理期居中弹窗），已经过多轮真实验收打磨。
4. 本次开发目标：【填写，例如：开发 M5 AI 聊天页，规格见 PRD.md §3.7】
5. 规则：
   - 有歧义先向我提问确认（具体到是/否），不要猜。
   - 任何编辑禁用 window.prompt/alert/confirm（Electron 下失效）；左键=详情、右键=功能菜单；UI 层禁 emoji。
   - 改完必过：tsc --noEmit 零错误 → npm run build 成功 → git 提交，然后我验收。
   - 小步快跑：一个功能→验收→提交，不攒批。
   - 每次改动用我能听懂的大白话解释改了哪些文件、为什么。

---

## 里程碑速查（详见 docs/PRD.md §5）

M1-M4 ✅ 完成 → M5 AI聊天+视觉+人物主页（需智谱API Key）→ M6 AI定时行为（读任务留言/问睡眠/悄悄话日记/提醒）→ V2 书影/旅行/看板/记忆衰减 → V3 小镇/Live2D/移动端

## 我自己要会的命令（全部）

```
npm install      # 首次/拉取新代码后
npm run dev      # 开发模式（改代码即时生效，验收用它）
npm run build    # 打包到 dist（双击桌面图标生效必须跑这个）
```
