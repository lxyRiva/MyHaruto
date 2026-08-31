# 开发接力卡（新会话必读）

> 用法：每次开新的 AI 编程会话（zcode / DeepSeek / 任何 Agent），把下面分隔线之间的话
> 复制粘贴作为第一条消息，AI 就能接上进度。【】里的内容按实际填写。

---

我在开发 MyHaruto（AI 恋人日程管理软件，Windows 桌面端，Electron+React+TS+Tailwind）。

1. 先按顺序读文档：docs/HANDBOOK.md（上手指南）→ docs/PRD.md（功能规格）→ docs/TECH.md（技术机制与铁律）→ docs/STRUCTURE.md（文件地图）。PRD.md 是功能权威。
2. 项目在 D:\Software\Zcode_appdata\.zcode\workspace\default\MyHaruto（构建必须走 D 盘路径）。运行：npm install（首次）→ npm run dev。
3. 当前进度（2026-08-31）：**四层结构全部完成并已推送 GitHub**——Step1 数据层 → Step2 L2清单树 → Step3 看板 → Step4 分组操作 → Step5 任务卡片交互 → Step6 今日/最近7天/右栏详情。收尾轮进行中：右键九项菜单全视图统一 ✅、关联主任务真实逻辑 ✅（commit f6aad2e，已推送）；**未完成**：①Tasks.tsx（全部页）还用旧 TaskNode 渲染，需换 ListTaskCard 并删除 Today.tsx 里的 TaskNode/buildMenu/descendantIds/PRIORITY_* 死代码 ②L1 图标右键上移/下移排序（localStorage key 'mh-l1-order'，chat/town 锚定底部，album/travel 需去掉 disabled 改样式置灰才能右键）。
4. 本次开发目标：【填：完成收尾轮剩余 ①②】
5. 规则：
   - 有歧义先向我提问确认（具体到是/否），不要猜。
   - 任何编辑禁用 window.prompt/alert/confirm（Electron 下失效）；左键=详情、右键=功能菜单；UI 层禁 emoji。
   - 改完必过：tsc --noEmit 零错误 → npm run build 成功 → git 提交（push 需我授权），然后我验收。
   - 小步快跑：一个功能→验收→提交，不攒批。
   - 每次改动用我能听懂的大白话解释改了哪些文件、为什么。

---

## 里程碑速查（详见 docs/PRD.md §5）

四层结构（H1清单→H2标签→Section分组→任务）✅ 全部视图 ✅ → 收尾轮（右键统一✅/关联✅/死代码清理⏳/L1排序⏳）→ M5 AI聊天+视觉+人物主页（需智谱API Key）→ M6 AI定时行为 → V2 书影/旅行/看板拖拽/记忆衰减 → V3 小镇/Live2D/移动端

## 我自己要会的命令（全部）

```
npm install      # 首次/拉取新代码后
npm run dev      # 开发模式（改代码即时生效，验收用它）
npm run build    # 打包到 dist（双击桌面图标生效必须跑这个）
```
