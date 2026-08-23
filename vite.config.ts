import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  // 固定端口：被占用时直接报错（可被发现），绝不悄悄换端口导致 electron 等错地方
  server: { port: 5173, strictPort: true },
})
