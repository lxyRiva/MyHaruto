【文件】DATA_LAYOUT.md
【用途】用户数据目录说明——数据存在哪、每个文件干什么
【读】全员（排查数据问题时）
【写】仅规划层
【上游】TECH.md §3
【下游】无
【更新】数据域变化时，规划agent提醒用户需要更新
【最后更新】2026-09-13

# 用户数据目录说明

## 1. 存储位置

- **默认**：`%APPDATA%/MyHaruto/data/`
- **可自定义**：通过 `%APPDATA%/MyHaruto/config.json` 的 `dataDir` 字段更改
- **首次启动**：弹窗选位置（可跳过用默认）
- **数据与配置分离**：config.json 永远在固定位置，数据可搬

## 2. 目录结构

```
%APPDATA%/MyHaruto/data/        ← 数据根（可自定义）
│
├── manifest.json                # { dataVersion, appVersion, lastMigratedAt }
│
├── user/
│   ├── profile.json             # 用户资料
│   └── settings.json            # 所有设置（主题/aiName/换肤 themeId）
│
├── tasks/                       # 任务系统
│   ├── tasks.json
│   ├── subTags.json
│   └── sections.json
├── focus-sessions.json          # 番茄钟记录
│
├── habits/
│   ├── habits.json
│   └── records.json
├── important-days.json
├── period-records.json
├── sleep-records.json           # M6 填
│
├── health/                      # M6 华为健康同步预留
│   ├── README.txt
│   └── huawei/
│       └── sync-config.json
│
├── albums/                      # M8 填
├── travel/                      # M8 填
│
├── ai/                          # M5/M6 填
│   ├── chat-messages.json       # 唯一聊天+留言源
│   ├── persona.md               # Haruto 人设
│   ├── impressions.json         # 印象演化链
│   ├── thoughts.json            # 念头池
│   ├── memories/
│   │   ├── fragments.json
│   │   ├── episodes.json
│   │   ├── entity-profiles.json
│   │   └── sagas.json
│   └── agent/
│       └── activity-log.json
│
├── town/                        # M2.5/M7 填
│   ├── scenes.json
│   ├── character-state.json     # 角色状态（3D 动画驱动）
│   └── activity-log.json
│
├── my-art/                      # 用户自定义美术资源
│   ├── README.txt
│   └── town/
│       ├── characters/haruto/
│       │   └── model.glb
│       └── rooms/room1/
│           └── model.glb
│
├── logs/
│   ├── operations.log           # 人读操作日志
│   └── changes.jsonl            # 删除留痕 {ts, domain, action, ids}
│
└── backups/                     # 启动滚动备份（保留 7 份）
```

## 3. 每个域什么时候填

| 域 | 填充时机 |
|---|---|
| user / tasks / focus-sessions / habits / important-days / period-records | ✅ 已有 |
| sleep-records | M6（AI 问询写入） |
| health | M6（华为同步） |
| albums / travel | M8 |
| ai | M5/M6 |
| town | M2.5 / M7 |
| my-art | 用户主动（覆盖默认资产） |

## 4. 备份与迁移

### 4.1 启动备份
启动时自动滚动备份（保留 7 份），存 `backups/`。

### 4.2 删除留痕
删除操作追加到 `logs/changes.jsonl`：
```
{ ts, domain, action: 'delete', ids: [...] }
```

### 4.3 版本迁移
- `manifest.json` 记 `dataVersion`
- 升级：数据版本落后 → 跑幂等迁移 → 写回新版本
- 降级保护：数据版本 > 应用支持 → 提示升级，不强行加载

### 4.4 自定义位置迁移
1. 复制全部数据到新目录
2. 逐域校验
3. 更新 config.json
4. 提示重启生效
5. 失败回滚（删新目录残留 + 不更新 config）

## 5. 隐私隔离

- GitHub 仓库内 `data/` 只放 AI 空模板 + 默认人设
- **用户实体数据永不上传**
- `.gitignore` 兜底校验

## 6. 资产覆盖优先级

用户自定义美术 **覆盖** 出厂美术：
- 读取顺序：`my-art/` > `public/builtin-art/`
- 换模型：把 `model.glb` 放 `my-art/town/characters/haruto/` 即自动覆盖

## 7. 相关文件

- 数据模型：TECH.md §3.2
- 文件结构：STRUCTURE.md
- 记忆库：MEMORY_DESIGN.md
