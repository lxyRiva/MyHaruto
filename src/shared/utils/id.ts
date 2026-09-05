// 通用 id 生成（原 App.tsx uid() 原样迁入）
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
