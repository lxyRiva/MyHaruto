// localStorage 持久化 state（RF-P3c 落地；DEV_RULES §2：localStorage 仅经本 hook，key 前缀 mh-，展示态不入库）
// 存取走 JSON 序列化；对历史存量键兼容：'320' 这类旧格式可被 JSON.parse 还原为 number
// sanitize（可选）：读取后对解析值清洗/校验（非法值回退默认），修复 P2b 以来 detailWidth 断裂时补充
import { useEffect, useState } from 'react'

export function useLocalStorage<T>(key: string, initial: T | (() => T), sanitize?: (v: T) => T) {
  const [value, setValue] = useState<T>(() => {
    const fallback = () => (typeof initial === 'function' ? (initial as () => T)() : initial)
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return fallback()
      const parsed = JSON.parse(raw) as T
      return sanitize ? sanitize(parsed) : parsed
    } catch {
      return fallback()
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* 写入失败（隐私模式/磁盘满）静默降级为内存态 */
    }
  }, [key, value])

  return [value, setValue] as const
}
