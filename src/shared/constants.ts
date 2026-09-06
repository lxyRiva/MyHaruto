// 跨域共享常量（RF-Fix1 起）：全库 AI 名字默认值唯一权威
// electron/main.js 为 CJS 无法 require TS，其 defaultDb/loadDb 的同值字面量
// 以「须与本文件 DEFAULT_AI_NAME 保持一致」注释锚定（见 DEV_RULES §2 加字段铁律）
export const DEFAULT_AI_NAME = 'Haruto'
