# 角色动画接入指南（3D 方案 v2 · 2026-09-09；骨架占位，RF-Town-MVP 时填充）

> 技术选型（已批准）：Three.js + @react-three/fiber；模型格式 .glb/.gltf（骨骼动画+blendshape）。
> 类型锚点：character-state.json 的 state 字段。

## 资产规格（动画师交付物，待制作）
- haruto.glb：含骨骼+动画片段 idle / talking / companion（状态映射：character-state.json state → AnimationClip 名）
- 房间场景 room1.glb（RF-Town-MVP 背景可选；缺省用 CSS 室内渐变占位）

## 加载优先级
用户数据目录 assets/（自定义模型） > 项目 public/builtin-art/town/characters/haruto/（出厂默认）

## 过渡策略
glb 到位前：three 占位几何体推进交互流（选任务/番茄钟/日志全链路可用）；到位后仅替换模型文件，CharacterStage 零代码改动。

## 待填（RF-Town-MVP 开工时）
模型面数/贴图规格、点击热区实现（raycaster）、状态切换动画过渡、Canvas 性能预算。
