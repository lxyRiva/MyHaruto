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
│   └── HANDBOOK.md          # 新 Agent 上手六步+协作规范
│
├── electron/                # Electron 主进程（Node 侧）
│   ├── main.js              # 窗口创建 + db.json 读写 IPC + 数据自愈（断环/补字段）
│   ├── preload.js           # contextBridge 暴露 window.myharuto.{getDb,saveDb}
│   └── wait-dev.js          # 开发模式：轮询5173就绪后拉起 electron（替代 wait-on）
│
├── public/assets/days/      # 重要日插画 PNG ×9（birthday/festival/custom 各3张）
│
└── src/                     # 界面代码（React 侧）
    ├── main.tsx             # React 挂载入口
    ├── App.tsx              # ★ 主帅文件：三层布局(L1图标栏/L2清单树/L3内容/右栏详情)、
    │                        #   全部数据 handlers、番茄钟状态机、页面路由
    ├── types.ts             # 全部数据类型（与 db.json 对应）
    ├── global.d.ts          # window.myharuto 类型
    ├── solarlunar.d.ts      # 农历库类型补丁
    ├── styles.css           # Tailwind 指令+全局样式+fadeSlideIn 动画
    │
    ├── components/
    │   ├── icons.tsx        # 线性图标库（lucide风格，侧栏/UI用）
    │   ├── FloatingMenu.tsx # 右键浮层菜单（支持二级子菜单）
    │   └── PomodoroBar.tsx  # 底部浮动计时条（倒计时/正计时）
    │
    └── pages/
        ├── Today.tsx        # ★ 今日页 + TaskNode 递归任务树（无限嵌套+统一右键+行内编辑）
        ├── Tasks.tsx        # 任务页（按 L2 清单筛选，复用 TaskNode）
        ├── PomodoroPage.tsx # 专注页（圆环计时+任务池含子任务+今日统计）
        ├── Calendar.tsx     # 月历（周/月双视图、速览添加、无日期提示）
        ├── Habits.tsx       # 习惯打卡（周/月/年、行内编辑、右键管理）
        ├── Stats.tsx        # 数据统计（名家色板饼图+竖排14格年度热力图+入睡折线）
        ├── ImportantDays.tsx# 重要日（PNG插画卡片+农历+右键嵌套菜单+生理期居中弹窗）
        └── Placeholder.tsx  # 未开发模块占位页
```

**运行产物**（.gitignore 已排除，不上传）：
- `node_modules/` 依赖实体（npm install 复原）
- `dist/` 打包后的界面（npm run build 生成；双击桌面快捷方式加载的就是它）

**数据文件**（不在仓库，在系统目录）：
- `%APPDATA%/MyHaruto/data/db.json` 全部用户数据
