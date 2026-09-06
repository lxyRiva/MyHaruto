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

四层结构（H1清单→H2标签→Section分组→任务）✅ 全部视图 ✅ → 收尾轮（右键统一✅/关联✅/死代码清理⏳【并入 RF-P2b】/L1排序⏳【并入 RF-P3c】）→ **重构线进行中：RF-P1 ✅（60b0377）、RF-P2a ✅（0754339）、RF-Fix1 ✅（2044e3f），RF-Fix2 待开工**（详见 docs/REFACTOR_CARDS.md）→ M5 AI聊天+视觉+人物主页（需智谱API Key）→ M6 AI定时行为 → V2 书影/旅行/看板拖拽/记忆衰减 → V3 小镇/Live2D/移动端

## 团队会话边界（2026-09-06 起强制，全文见 docs/DEV_RULES.md §8）

- 开发/测试/审查各开独立会话，禁止同会话兼任多角色。
- 测试会话只跑验收清单、出测试报告，禁止修改代码；问题回报，开发会话修复。
- 审查会话开工第一条消息显式声明「切换为审查模式」，全程只读。
- 规划会话只出卡不改码。各角色经 CONTINUE.md 接力，每卡收尾更新为下一卡状态。
- 当前阶段：**RF-Fix1 已提交（2044e3f，审查报告 P1+P2a 有条件通过、唯一警告转 Fix2）；RF-Fix2（横板已完成折叠区+子任务计时显示+死声明清理）待开工；P2b 等 Fix2 解锁；RF-P7 设置中心已登记（P6b 后，v1.0.0 收官随其后）**。后续循环以 docs/REFACTOR_CARDS.md 为准。

## 我自己要会的命令（全部）

```
npm install      # 首次/拉取新代码后
npm run dev      # 开发模式（改代码即时生效，验收用它）
npm run build    # 打包到 dist（双击桌面图标生效必须跑这个）
```
