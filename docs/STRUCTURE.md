# MyHaruto 项目文件结构说明

> 项目根：`D:\Software\Zcode_appdata\.zcode\workspace\default\MyHaruto`
> （`C:\Users\Willa Lin\.zcode\workspace\default\MyHaruto` 是同一位置的映射路径，构建请走 D 盘）

```
MyHaruto/
├── PROJECT_SPEC.md          # 项目说明书（需求基线 v1.0，历史文档；最新功能以 docs/PRD.md 为准）
├── README.md                # GitHub 门面：简介+技术栈+运行方式
├── CONTINUE.md              # ★ 新会话/新Agent 接力卡（复制其内容作为第一条消息即可无缝续接）
├── package.json             # 依赖清单与脚本（dev/build）
├── vite.config.ts           # 端口锁5173+strictPort（勿动，动了启动链错位）
├── tsconfig.json / tailwind.config.js / postcss.config.js
├── index.html               # 界面入口（Vite）
│
├── docs/                    # ★ 文档区（新 Agent 必读）
│   ├── PRD.md               # 产品需求：定位/布局/每模块功能规格/视觉规范/里程碑状态
│   ├── TECH.md              # 技术：栈/启动/数据模型/关键机制/开发铁律
│   ├── STRUCTURE.md         # 本文件：文件地图
│   ├── DEV_RULES.md         # ★ 开发铁律（目录/数据/规模/禁令/提交/会话边界/排障）
│   ├── REFACTOR_CARDS.md    # ★ 重构任务卡总集（六阶段+Fix 卡唯一任务来源）
│   ├── VISUAL_EFFECTS.md    # 主题过渡动效（视觉签名，勿删）
│   └── HANDBOOK.md          # 新 Agent 上手六步+协作规范
│
├── electron/                # Electron 主进程（Node 侧）
│   ├── main.js              # 窗口创建 + db.json 读写 IPC + 数据自愈（断环/补字段）
│   ├── preload.js           # contextBridge 暴露 window.myharuto.{getDb,saveDb}
│   └── wait-dev.js          # 开发模式：轮询5173就绪后拉起 electron（替代 wait-on）
│
├── public/assets/days/      # 重要日插画 PNG ×9（birthday/festival/custom 各3张）
│
└── src/                     # 界面代码（React 侧，features 分层，RF-P1~P3b）
    ├── main.tsx             # React 挂载入口
    ├── App.tsx              # ★ 主帅文件：数据 hooks 编排 + nav API（路由四件套成套同步）
    │                        #   + 布局组合（L1/L2/MainArea/右栏/弹窗接线）
    ├── global.d.ts          # window.myharuto 类型
    ├── solarlunar.d.ts      # 农历库类型补丁
    ├── styles.css           # Tailwind 指令+全局样式+fadeSlideIn 动效（视觉签名）
    │
    ├── app/                 # 应用壳（RF-P3b 抽取）
    │   └── layout/
    │       ├── L1Sidebar.tsx      # L1 图标导航栏
    │       ├── L2Sidebar.tsx      # L2 清单树（H1/H2 树+拖拽把手+右键菜单+解散确认）
    │       ├── MainArea.tsx       # L3 内容区路由 + 右栏详情面板
    │       ├── SettingsModal.tsx  # 设置弹窗（App 受控开关，草稿态组件内）
    │       └── Placeholder.tsx    # 未开发模块占位页
    │
    ├── features/            # ★ 按功能域分层（域间禁止互 import，见 DEV_RULES §1）
    │   ├── tasks/           # 任务系统（核心域）
    │   │   ├── pages/Today.tsx          # 今日页（逾期/今天分组+已完成折叠区）
    │   │   ├── pages/Tasks.tsx          # 任务页（五分组+NewTaskBar+已完成折叠区）
    │   │   ├── components/BoardView.tsx       # 看板视图（视图A=H1总览/视图B=H2单标签）
    │   │   ├── components/BoardColumn.tsx     # 看板列（Section 列+聚合折叠区）
    │   │   ├── components/TaskCard.tsx        # 看板任务卡（含子任务嵌套/悬空详情）
    │   │   ├── components/ListTaskCard.tsx    # 列表任务卡（横板共用+DoneFoldSection 折叠区）
    │   │   ├── components/NewTaskBar.tsx      # 新建任务行（日期+优先级四旗+H2 选择）
    │   │   ├── components/TaskDetailPanel.tsx # 右栏任务详情（子任务/检查事项/AI留言/动作行）
    │   │   ├── components/taskMenu.tsx        # 右键九项菜单构建器+优先级件（四视图同源）
    │   │   ├── components/DateTimePickers.tsx # 日期选择器/提醒/小时滚轮
    │   │   ├── components/ChecklistRow.tsx    # 检查事项行（勾选/行内编辑/闹钟）
    │   │   ├── components/SubTagModal.tsx     # H2 标签弹窗+18色板
    │   │   ├── hooks/useTaskActions.ts        # 任务/清单/检查事项数据变更 (db,setDb)
    │   │   ├── hooks/useTaskSelectors.ts      # 任务派生数据 (db,selectedId) 纯派生
    │   │   ├── utils/tree.ts                  # rootOf/isRootAggregated（看板+横板共用）
    │   │   ├── utils/boardSort.ts             # 排序：日期→优先级→done 沉底→新任务在前
    │   │   └── types.ts                       # Priority 等域内类型
    │   ├── pomodoro/
    │   │   ├── pages/PomodoroPage.tsx         # 专注页（圆环+任务池含子任务+今日统计）
    │   │   ├── components/PomodoroBar.tsx     # 底部浮动计时条
    │   │   └── hooks/usePomodoro.ts           # 番茄状态机（pomoCompletingRef 互斥锁）
    │   ├── calendar/pages/Calendar.tsx        # 月历（周/月双视图、速览添加）
    │   ├── habits/
    │   │   ├── pages/Habits.tsx               # 习惯打卡（周/月/年、行内编辑）
    │   │   └── hooks/useHabits.ts
    │   ├── stats/pages/Stats.tsx              # 统计（名家色板饼图+竖排热力图+入睡折线）
    │   └── important-days/
    │       ├── pages/ImportantDays.tsx        # 重要日（插画卡片+农历+生理期弹窗）
    │       └── hooks/useImportantDays.ts
    │
    └── shared/               # 跨域共享（features 复用唯一入口，见 DEV_RULES §1）
        ├── components/icons.tsx         # 线性图标库（lucide 风格）
        ├── components/FloatingMenu.tsx  # 右键浮层菜单（支持二级子菜单）
        ├── types.ts                     # 全部数据类型（与 db.json 对应）
        ├── constants.ts                 # DEFAULT_AI_NAME 等全局常量
        └── utils/id.ts                  # uid() 生成器
```

**运行产物**（.gitignore 已排除，不上传）：
- `node_modules/` 依赖实体（npm install 复原）
- `dist/` 打包后的界面（npm run build 生成；双击桌面快捷方式加载的就是它）

**数据文件**（不在仓库，在系统目录）：
- `%APPDATA%/MyHaruto/data/db.json` 全部用户数据
