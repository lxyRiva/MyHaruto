【文件】CHARACTER_ANIMATION.md
【用途】角色动画接入技术测试——⚠️ 骨架占位，待 M2.5 后定稿
【读】规划层、M2.5/M7 开发者
【写】仅规划层
【上游】PROJECT_ROADMAP.md
【下游】TECH.md
【更新】M2.5 技术握手后更新，由规划层agent提醒在此环节开始时提醒用户
【最后更新】2026-09-13

⚠️ **本文件为骨架占位。**
- **M2.5** 只验证 three + @react-three/fiber + glb 或其他3D实现技术**能接入软件**（技术握手，非最终版）
- **M7** 定稿完整动画驱动规范

## 1. 暂定方向

- **技术栈**：three + @react-three/fiber（DEV_RULES §4 已批准例外）
- **模型格式**：.glb / .gltf（含骨骼动画与 blendshape）
- **渲染解耦**：CharacterStage 组件 + 角色状态文件，美术资产与代码解耦
- **资产覆盖优先级**：`用户数据/my-art/` > `public/builtin-art/`
- **M2.5 交付范围（非最终版）**：验证 3 套动作 + 3 组表情能跑通（用于房间家具交互测试，防数据层隐患）

## 2. 待 M2.5 确认（技术可行性）
- three + glb 在 Electron 下能否稳定加载（性能/内存/冷启动）
- 是否更换/增添其他技术组合
- 动作片段切换是否流畅
- blendshape 表情是否兼容
- 用户自定义模型的加载通路

## 3. 待 M7 定稿（完整体验）
- 角色状态文件的字段定义（state 枚举）
- state → 动画片段的映射规则
- 动作触发机制（点击热区 / 事件驱动 / 定时）
- 模型加载失败时的降级方案
- 用户自定义模型的兼容性约束（骨骼命名规范？动作命名规范？）
- 房间场景与角色的空间坐标规范
- 光照/材质规范（多套配色下角色观感一致）

## 4. M2.5 交付物（技术验证版，非最终版）
- `CharacterStage.tsx`（3D Canvas 容器）
- `RoomScene.tsx`（房间场景）
- `TownPage.tsx`（L1 小镇入口）
- `public/builtin-art/town/rooms/room1/`（出厂房间资产）
- 3D Character Model包含anim(人物的3D模型资产、骨骼、动画)
- 3D人物与房间组件的交互动画
- 用户模型读取通路

## 5. 相关文件
- 文件结构：STRUCTURE.md
- 数据目录：DATA_LAYOUT.md
- 记忆库：MEMORY_DESIGN.md
