// 统一本地日期工具（RF-P3c 收口：全库唯一实现，DEV_RULES §3「日期一律 shared/utils/date.ts」）
// 铁律（DEV_RULES §7）：日期只存 YYYY-MM-DD 字符串，比对走本地时区——toISOString 是 UTC，
// 北京时间 0-8 点会算到前一天（曾致时区 bug），本文件一切换算均走本地时区，勿改用 ISO。

/** 数字补零为两位字符串 */
export const pad2 = (n: number): string => String(n).padStart(2, '0')

/** Date → 'YYYY-MM-DD'（本地时区） */
export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 当天的 'YYYY-MM-DD'（本地时区） */
export function todayStr(): string {
  return fmtDate(new Date())
}

/** ISO 时间字符串 → 本地 'YYYY-MM-DD'（直接 slice 是 UTC 日期，0-8 点的记录会算到前一天） */
export function localDateOf(iso: string): string {
  return fmtDate(new Date(iso))
}

/** 'YYYY-MM-DD' 加 n 天（Date 进位，跨月/跨年安全），返回 'YYYY-MM-DD' */
export function addDaysStr(base: string, n: number): string {
  const [y, m, d] = base.split('-').map(Number)
  return fmtDate(new Date(y, m - 1, d + n))
}

/** 下一个周X（target: 0=日 … 6=六；当天恰为周X时返回下周X），基于 base 起算 */
export function nextWeekdayStr(target: number, base: string): string {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const diff = (((target - dt.getDay()) % 7) + 7) % 7 || 7
  return addDaysStr(base, diff)
}
