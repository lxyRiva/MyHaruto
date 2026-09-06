// 占位页：还没开发的模块按里程碑排期（侧边栏会显示 M3/M4/V2 等标记）
export default function Placeholder({ label }: { label: string }) {
  return (
    <div className="h-full grid place-items-center">
      <div className="text-center">
        <div className="text-4xl mb-3">🚧</div>
        <div className="font-medium">{label}</div>
        <div className="mt-1 text-sm text-neutral-400">按路线图排期开发中，见 PROJECT_SPEC.md §11</div>
      </div>
    </div>
  )
}
