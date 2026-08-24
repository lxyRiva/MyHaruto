// solarlunar 包自带的 .d.ts 无法经 package.json exports 解析（TS7016），本地补声明
declare module 'solarlunar' {
  const solarlunar: {
    solar2lunar: (y: number, m: number, d: number) =>
      | { monthCn: string; dayCn: string; isLeap: boolean; [k: string]: unknown }
      | -1
    lunar2solar: (y: number, m: number, d: number, isLeapMonth?: boolean) =>
      | { year: number; month: number; day: number; [k: string]: unknown }
      | -1
  }
  export default solarlunar
}
