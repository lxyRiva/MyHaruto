【文件】WORKFLOW_SOP.md
【用途】用户全流程 SOP——你在什么阶段做什么
【读】用户
【写】仅规划层（用户可批注）
【上游】PROJECT_ROADMAP.md
【下游】无
【更新】流程变化时，由规划层agent自行更新写入
【最后更新】2026-09-13

# 用户全流程 SOP

## 1. 每张卡完成时，你要做

1. **手测**：按开发给的对照表逐条过
2. **回执**：给规划层"通过 / 不通过 + 现象"
3. **授权 commit**：规划层问"是否批准 commit"，你回"批准"
4. **卡总集归档**（大卡全部子卡完成时）：
   - 从项目树复制整卡目录到本地归档文件夹
   - 确认可读后，规划层从项目树删除

## 2. 每个 M 阶段完成时，你要做

1. 检查 PROJECT_ROADMAP 是否更新
2. 检查该阶段全部卡的归档是否完整
3. 检查 DEV_RULES / PLANNER_RULES 是否需同步
4. 复审规划层的"文件更新汇报"

## 3. 项目版本收官时（v1.0.0 / v2.0.0），你要做

1. 全量归档（本地 + git tag）
2. 开源准备（README / CHANGELOG / package.json）
3. 新建下一期目录
4. **MILESTONES / ROADMAP 归档**到 `docs/archive/`
5. 新一期从零开始

## 4. 日常审查

- **每周**：抽查 1 张卡文件的状态行是否有假阳性
- **每月**：检查 .gitignore 是否漏用户数据
- **随时**：发现规划层擅自 commit，立即警告

## 5. 卡总集归档规则

**触发时机**：一张大卡（主卡 + 全部子卡）**全部 commit + push + tag 到位**  
（不是每轮、不是每张子卡）

**你要做：**
1. 等规划层汇报"X 卡已收官"
2. 从项目树复制整卡目录到 `E:\MyHarutoArchive\<年-Q季>\`
3. 确认可读后，规划层从项目树删除
4. 归档完成

## 6. git 操作教程

**commit 和 push 是两件事：**
- commit：本地存快照（频繁）
- push：推到 GitHub（低频，一天一次）

**三条命令：**
```bash
git status                    # 看改了哪些
git add <具体文件>             # 选
git commit -m "<类型>: <说明>" # 存
```

**铁律：**
- 禁 `git add -A`（会混线）
- 一文件一 commit
- commit message：`docs:` / `fix:` / `feat:` / `refactor:` / `chore:`

## 7. 遇事如何处理

**zcode 擅自 commit** → 立即警告 + 记录违规  
**文件不知道改没改** → 跑 `git log --oneline -- <文件>`  
**git 报错** → 贴原文给我或规划层，不许自己乱试 `git reset --hard`

## 8. 关键联系人/文件

- 规则：CARD_PROTOCOL / PLANNER_RULES / DEV_RULES
- 导航：PROJECT_ROADMAP
- 状态：AGENT_STATE
