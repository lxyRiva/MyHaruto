【文件】CHARACTER_ANIMATION.md
【用途】角色动画接入指南——⚠️ 骨架占位，待 M2.5 后定稿
【读】规划层、M2.5/M7 开发者
【写】仅规划层
【上游】PROJECT_ROADMAP.md
【下游】TECH.md
【更新】M2.5 技术握手后填充，由规划agent提前提醒用户
【最后更新】2026-09-13

# 角色动画接入指南（骨架）

⚠️ **本文件为骨架占位。** 完整技术方案待 **M2.5（3D 资产过渡技术阶段）** 握手后定稿。

## 1. 已定方向

- **技术栈**：three + @react-three/fiber（DEV_RULES §4 已批准例外）
- **模型格式**：.glb / .gltf（含骨骼动画与 blendshape）
- **渲染解耦**：CharacterStage 组件 + 角色状态文件，美术资产与代码解耦
- **资产覆盖优先级**：`用户数据/my-art/` > `public/builtin-art/`
- **M2.5 交付范围**：3 套动作 + 3 组表情（用于房间家具交互测试，防止数据层隐患）

## 2. 待定问题（M2.5 后讨论）

- 角色状态文件的字段定义（state 枚举：idle/talking/focusing/...）
- state → 动画片段的映射规则
- 动作触发机制（点击热区 / 事件驱动 / 定时）
- blendshape 表情驱动方式
- 模型加载失败时的降级方案
- 用户自定义模型的兼容性约束（骨骼命名规范？动作命名规范？）
- 房间场景与角色的空间坐标规范
- 光照/材质规范（保证多套配色下角色观感一致）

## 3. M2.5 交付物

- `CharacterStage.tsx`（3D Canvas 容器）
- `RoomScene.tsx`（房间场景）
- `TownPage.tsx`（L1 小镇入口）
- `public/builtin-art/town/rooms/room1/`（出厂房间资产）
- 用户模型读取通路（`my-art/town/characters/haruto/model.glb`）

## 4. 相关文件

- 文件结构：STRUCTURE.md
- 数据目录：DATA_LAYOUT.md
- 记忆库：MEMORY_DESIGN.md
