【文件】VERSION_MIGRATION_v1.md
【用途】旧卡名 → 新编号映射表（一次性文档）
【读】规划层（追溯旧卡时）
【写】仅规划层
【上游】无
【下游】无
【更新】仅本次迁移使用，未来不再更新
【最后更新】2026-09-13

# 版本映射表 v1

**用途**：追溯旧卡（RF-*）与新编号（M-V）的对应关系。  
**归档位置**：`docs/archive/`（默认不读，仅追溯时查）。

## 旧卡 → 新编号

| 旧名 | 新编号 | 内容 |
|---|---|---|
| RF-P1 | M2-V1 | App 抽 4 hook + 1 选择器 |
| RF-P2a | M2-V2 | BoardView 拆分 |
| RF-Fix1 | M2-V3 | 聚合语义树化 + aiName |
| RF-Fix2 | M2-V4 | 横板折叠区 + 子任务计时 |
| RF-Fix3 | M2-V5 | 聚合取消级联 + done 沉底 |
| RF-P2b | M2-V6 | 右栏统一 |
| RF-P3a | M2-V7 | 全库纯搬移归位 |
| RF-Fix3a | M2-V8 | 重要日运行时修复 |
| RF-P3b | M2-V9 | 布局抽取 |
| RF-Fix3c | M2-V10 | 视图一致性统一 |
| RF-P3c | M2-V11 | 日期收口 + L1 排序 |
| RF-Data | M2-V12 | 数据层合并卡 |
| RF-B1 | M2-V13 | 子任务右栏 + 置顶语义 v3 |
| RF-Polish | M2-V14 | bug + 需求批量池 |
| RF-Clean | M2-V15 | 死代码清扫 |
| RF-Town-MVP | M7-V1 | 小镇正式版 |
| RF-Moments | M8-V1 | 书影/旅游 UI |
| RF-H1 | M9-V1 | 历史快照 |
| RF-Release | M9-V2 | 设置中心 + 收官 |

## 已归档文件

| 旧文件 | 归档位置 | 归档日期 |
|---|---|---|
| REFACTOR_CARDS.md | 用户本地归档 | 待定（v2 收卡时） |
| PROJECT_SPEC.md | docs/archive/ | 待定 |

## 说明

- 旧卡（RF-*）已全部作废，不再引用
- 本表仅在追溯旧 commit / 旧卡时使用
- 未来版本不再使用本表
