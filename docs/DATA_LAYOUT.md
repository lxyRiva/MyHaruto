# 数据文件夹说明（v1 · 2026-09-09 从 TECH §3.1 + README 教程提炼）

## 位置
- 默认：`%APPDATA%/MyHaruto/data/`；可经 `%APPDATA%/MyHaruto/config.json`（{ dataDir }）自定义
- 首次启动弹窗选位置（可跳过）；设置 → 数据位置 → 更改位置（复制→校验→重启生效，失败回滚）

## 布局（RF-Data-2 起）
```
manifest.json            # dataVersion + appVersion + lastMigratedAt（降级保护）
user/settings.json
tasks/{tasks,subTags,sections}.json
focus-sessions.json │ habits/{habits,records}.json
important-days.json │ period-records.json │ sleep-records.json
albums/ │ travel/ │ town/ │ ai/          # 随对应功能启用
assets/                  # 用户上传/自定义模型（加载优先级高于内置）
logs/operations.log │ logs/changes.jsonl # 操作行 + 删除留痕（追加，失败不阻断）
backups/                 # 启动滚动备份，保留 7 份
```

## 备份与恢复
- 每次启动自动备份整库到 backups/，保留 7 份；迁移前另存 pre-migration 快照
- 手动备份=整目录拷贝；回退到旧版=把 backups 内快照复制回根（详见 README「📁 你的数据存在哪」）

## 隔离铁律
GitHub 仓库内 data/ 只放 AI 空模板（data/ai/）；用户实体数据永不上传。
