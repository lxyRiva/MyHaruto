# 视觉动效签名

> 给未来 Agent / 开发者：以下是用户明确要求保护的效果，任何 UI 重构**不得删除或改变**。

## 主题切换过渡

- **效果**：所有颜色属性（background-color / color / border-color）在 0.25s 内 ease 平滑过渡，日/夜切换时全界面颜色渐变而非跳变
- **实现**：`src/styles.css` 中的全局 `* { transition: ... }` 规则（上方有「视觉签名，勿删勿改」注释）
- **配套**：`src/App.tsx` 监听 `db.settings.theme` 切换 `<html>` 的 `dark` class（同样有保护注释），Tailwind `darkMode: 'class'` 据此生效
- **保护级别**：最高。重构样式时若需拆分 transition，必须保留等价的三属性 0.25s ease 过渡
- **用户评价**：2026-08-31 确认"非常漂亮"，要求永久保留
