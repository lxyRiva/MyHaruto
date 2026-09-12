【文件】STRUCTURE.md
【用途】项目结构设计说明书——解释目录组织原则与关键位置
【读】全员
【写】仅规划层
【上游】PROJECT_ROADMAP.md（时间/任务导航）
【下游】TECH.md（技术细节）
【更新】目录结构或组织原则变化时
【最后更新】2026-09-13

# MyHaruto 项目结构设计

本文件回答：**为什么项目这样组织文件？**
如果你要问"现在做什么"，请看 PROJECT_ROADMAP.md。
如果你要问"某个功能怎么实现"，请看 TECH.md。

## 一、顶层设计原则

### 原则 1：软件本体与用户数据物理分离

```
软件本体（仓库/随代码发布）      用户数据（系统目录/随用户走）
  ├── src/                        ├── %APPDATA%/MyHaruto/data/
  ├── electron/                   │
  ├── public/builtin-art/         │   ← 出厂美术
  └── docs/                       └── my-art/  ← 用户自定义美术
```

**为什么这样分**：
- 用户数据永不上传（.gitignore 兜底校验）
- 用户可自定义美术资产（`my-art/` 覆盖 `builtin-art/`）
- 升级应用不动用户数据；迁移数据不动应用

**覆盖优先级**：`用户 my-art/` > `应用 public/builtin-art/`

### 原则 2：渲染端按功能域分层

```
src/
├── app/        # 应用壳（路由 + 布局组合）
├── features/   # 功能域（按业务模块切分）
│   ├── tasks/
│   ├── pomodoro/
│   └── ...
├── shared/     # 跨域共享（域间复用唯一入口）
└── data/       # 数据层（唯一入口 repository.ts）
```

**为什么这样分**：
- **域间禁互 import**（DEV_RULES §1）——防止一个 feature 改坏另一个
- **复用只走 shared/**——避免"域 A 依赖域 B 内部"的隐性耦合
- **数据操作走 repository.ts**——渲染端唯一数据入口，组件不碰 IPC

### 原则 3：业务规则单点化

**同一语义只允许一个实现**（DEV_RULES §10）。以任务系统为例：

```
features/tasks/utils/           # ★ 唯一实现层
├── taskTree.ts                 # 树操作（rootOf/treeOf/collapsedOf）
├── taskDelete.ts               # 删除（collectTreeIds）
├── taskMeta.ts                 # 卡片 meta 行组装
├── taskSort.ts                 # 排序（唯一实现）
└── groupPosition.ts            # 组位置（横板单点显示）
```

**为什么这样分**：
- 视图组件（横板/看板/右栏）只做**布局适配**
- 业务逻辑全部下沉 utils/——改一处，全视图生效
- 审查时 grep 函数名，全库应只有 1 个定义点

### 原则 4：主进程与渲染端职责清晰

```
主进程（electron/）              渲染端（src/）
  窗口管理                          React 组件树
  IPC 委托                          数据 hooks
  数据读写（store.js/layout.js）    数据仓库（repository.ts）
```

**为什么这样分**：
- **渲染端不碰文件系统**——所有数据操作走 IPC 通道
- **主进程不做业务逻辑**——只做窗口 + 数据读写
- **桥接层（preload.js）收口**——`window.myharuto` 五通道

### 原则 5：文档按"读的顺序"分层

```
docs/
├── HANDBOOK.md          # 1. 新人从这开始
├── PROJECT_ROADMAP.md   # 2. 去哪（时间/任务导航）
├── AGENT_STATE.md       # 3. 现在在哪（状态）
├── CARD_PROTOCOL.md     # 4. 卡怎么管
├── DEV_RULES.md         # 5. 开发规则
├── ...
├── cards/               # 6. 具体任务
└── archive/             # 7. 历史
```

**为什么这样分**：新人按顺序读，读完知道"去哪、做什么、什么规则"。每个文件只回答一个问题，不重复。

## 二、目录树（按结构分组）

### 2.1 软件本体

```
MyHaruto/
├── electron/          # 主进程
│   ├── main.js        # 窗口 + IPC 委托
│   ├── preload.js     # 桥接（window.myharuto 五通道）
│   ├── wait-dev.js    # 开发模式启动器
│   └── data/
│       ├── store.js   # 读写入口 + 原子写 + 备份
│       └── layout.js  # 多文件布局 + 迁移 + 降级保护
│
├── src/               # 渲染端
│   ├── app/           # 应用壳
│   ├── features/      # 功能域
│   ├── shared/        # 跨域共享
│   ├── data/          # 数据层
│   └── main.tsx
│
├── public/builtin-art/  # 出厂美术
│   ├── days/            # 重要日插画 ×9
│   └── town/            # 小镇默认 3D 资产
│
├── docs/              # 文档
├── scripts/           # 工具脚本
├── README.md / CHANGELOG.md
└── package.json / vite.config.ts / tsconfig.json 等
```

**完整文件清单与职责见 TECH.md §1、§2**（本文件只讲结构原则，不重复枚举）。

### 2.2 features/ 内部结构（每个功能域统一）

```
features/<域>/
├── components/    # 视图组件（只做布局适配）
├── hooks/         # 数据 hooks（db, setDb）
├── pages/         # 页面组件
├── utils/         # 业务规则单点（域内唯一实现）
└── types.ts       # 域内类型
```

**统一结构的意义**：新功能域进来，照这个骨架建目录即可，不重新讨论布局。

## 三、用户数据目录

```
%APPDATA%/MyHaruto/data/   # 默认路径，可通过 config.json 更改
├── manifest.json          # 版本管理
├── user/                  # 用户资料 + 设置
├── tasks/                 # 任务系统
├── habits/                # 习惯
├── focus-sessions.json    # 番茄钟
├── important-days.json / period-records.json / sleep-records.json
├── health/                # 健康（M6 华为同步预留）
├── ai/                    # AI 域（M5/M6 填充）
├── town/                  # 小镇（M2.5/M7 填充）
├── albums/ travel/        # 书影旅游（M8 填充）
├── my-art/                # 用户自定义美术（覆盖 builtin-art）
├── logs/                  # 操作日志 + 删除留痕
└── backups/               # 滚动 7 份
```

**完整说明见 docs/DATA_LAYOUT.md。**

## 四、关键设计决策速查

| 决策 | 位置 | 为什么 |
|---|---|---|
| 域间禁互 import | DEV_RULES §1 | 防跨域耦合 |
| 数据操作走 repository | DEV_RULES §2 | 渲染端唯一数据入口 |
| 业务规则单点化 | DEV_RULES §10 | 一份实现，全视图生效 |
| 软件本体/用户数据分离 | 本文件 §1 原则 1 | 隐私 + 可自定义 |
| features 统一骨架 | 本文件 §2.2 | 新域零讨论落地 |
| 主进程/渲染端分离 | 本文件 §1 原则 4 | 职责清晰 |

## 五、相关文件

- 做什么：PROJECT_ROADMAP.md
- 怎么实现：TECH.md
- 开发规则：DEV_RULES.md
- 数据目录细节：DATA_LAYOUT.md
- 当前状态：AGENT_STATE.md
