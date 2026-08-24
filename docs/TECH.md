# MyHaruto 技术文档

> 给下一个开发者/Agent：本文讲清架构、数据、关键机制和开发流程。配合 STRUCTURE.md（文件地图）与 HANDBOOK.md（上手指南）食用。

## 1. 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 桌面壳 | Electron 31 | 主进程 electron/main.js：窗口+本地数据读写（IPC） |
| 构建 | Vite 5 + @vitejs/plugin-react | base:'./'（Electron file:// 加载相对路径）；**端口锁死5173+strictPort**（防 wait 链错位） |
| 界面 | React 18 + TypeScript (strict) | 全部函数组件+hooks |
| 样式 | Tailwind CSS 3.4 | darkMode:'class'；自定义色 haruto-sea=#3d7ea6 |
| 图表 | ECharts 5（饼图/折线）+ 纯div网格（热力图） | 热力图不用ECharts（像素级控制） |
| 农历 | solarlunar | 类型声明补丁在 src/solarlunar.d.ts（包的 exports 不带 types） |

无路由库（单窗口 useState 切页）、无状态管理库（App 单点 state+props 下发）、无 UI 组件库（全部手写 Tailwind）。

## 2. 启动与构建

```bash
npm install        # 首次
npm run dev        # 开发模式：vite + wait-dev.js 轮询5173 → 拉起 electron（支持热更新）
npm run build      # 打包界面到 dist/（不打包exe）
```
- **日常使用**：双击桌面「MyHaruto」快捷方式（electron.exe 加载 dist；**改代码后必须 npm run build 才生效**）
- **验收迭代**：用 npm run dev（改代码即时热更新）
- 真正的安装版 exe（electron-builder）尚未配置，属后期任务

## 3. 数据架构

### 3.1 存储位置
`%APPDATA%/MyHaruto/data/db.json`（C:\Users\<用户>\AppData\Roaming\MyHaruto\data\db.json）——单 JSON 文件，主进程 fs 读写，preload 桥接 `window.myharuto.getDb()/saveDb()`。图片等静态资源在 public/assets/。

### 3.2 数据模型（src/types.ts，与 db.json 一一对应）
```
Task{ id,title,description,dueDate('YYYY-MM-DD'|null),done,createdAt,
      tagId, parentTaskId(子→父，无限嵌套), priority('none'|low|mid|high),
      masterTaskId(关联归并), isPinnedToday }
Tag{ id,name,color,isSpecial }        // isSpecial=愿景标签排L2顶部
FocusSession{ id,taskId,startedAt(ISO),minutes }
Habit{ id,name,icon,monthlyTarget,createdAt } / HabitRecord{ id,habitId,date }
ImportantDay{ id,title,type, date('MM-DD'每年重复|'YYYY-MM-DD'),repeatYearly,
              remindDaysBefore,note, archived? }
PeriodRecord{ id,startDate,endDate|null }   // null=进行中（仅开始日标记，不蔓延）
SleepRecord{ id,date,bedtime('HH:MM') }     // M6 AI 问询写入
settings{ theme:'light'|'dark' }
```
**注意**：部分展示态字段不入库，存 localStorage：习惯年目标覆盖值(mh-year-target-{id})、重要日图样(mh-day-style-{id})、重复模式(mh-day-repeat-{id})、置顶(mh-day-pinned-{id})、农历标记(mh-day-lunar-{id})、侧栏折叠(mh-sidebar)。

### 3.3 数据自愈（electron/main.js loadDb）
加载时自动：补齐缺失字段（版本兼容）、断开 parentTaskId 环/悬空引用（历史脏数据曾致白屏）。**新增字段必须同时在 defaultDb 和 loadDb 兜底**。

## 4. 关键机制

### 4.1 专注时长归并（统计铁律）
Stats.tsx 的 `rootTaskIdOf(taskId)`：先沿 parentTaskId 上溯到顶 → 若顶任务有 masterTaskId 则跳过去继续（递归+环保护）。日视图按原任务、月/年按归并结果。

### 4.2 计时互斥
App 的 `pomoCompletingRef`（useRef 锁）：PomodoroBar 与 PomodoroPage 都可能触发"到点完成"，锁保证一次计时只记一条 FocusSession。正计时暂停/继续用 swAccum 累计（恢复时 startedAt=now，暂停时 swAccum+=增量，防双倍计数）。

### 4.3 递归任务树防环
Today.tsx `TaskNode` 递归渲染，`_seen: Set<string>` 记录祖先链，环数据只显示一层不炸。数据层还有 loadDb 自愈双保险。

### 4.4 年度热力图（竖排连续填充）
每列14格连续排日期（cells 数组按天生成，slice(c*14, c*14+14) 切列）；月份标签每3个月；5级固定阈值（0/30/60/120分钟）——**不随最大值自适应**（1分钟必须是最浅档）。

### 4.5 Electron 环境禁令
**window.prompt/alert/confirm 在 Electron 静默失效**——一切编辑用行内 input；一切确认用居中 modal；一切菜单用 FloatingMenu（支持二级子菜单 hover 右侧展开）。

## 5. 开发铁律（血泪教训）

1. **改完必过三关**：`tsc --noEmit`（零错误）→ `npm run build`（成功）→ 提交。vite build 不做类型检查，tsc 必须单独跑
2. **从 D 盘真实路径构建**：`D:\Software\Zcode_appdata\.zcode\workspace\default\MyHaruto`（C 盘 junction 路径会让 Vite HTML 插件解析失败）
3. import 驱动的白屏：default/named import 写错（如 `import TaskNode from` 应为 `import { TaskNode } from`）编译能过但运行时白屏——tsc 能抓，别跳过
4. 左键=详情右键=菜单的交互对任何层级任务一致，不许分叉
5. UI 禁 emoji（用户数据的习惯 icon 除外）；图标加到 src/components/icons.tsx
6. 文件职责见 STRUCTURE.md；多 Agent 并行时按文件划界，App.tsx/Today.tsx 是热区归主脑
