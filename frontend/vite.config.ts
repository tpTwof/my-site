import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 本地后端地址。前端一律请求相对路径 /api/...，由 dev server 代理过去，
// 这样页面与 API 永远同源——登录 Cookie 不会因 host 不一致而丢失。
const BACKEND = process.env.VITE_DEV_BACKEND ?? 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': import.meta.dirname + '/src',
    },
  },
  server: {
    // 绑 0.0.0.0 以便 localhost 与 127.0.0.1 都能访问；
    // 两个 host 下页面都请求相对路径，因此不存在跨站问题。
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: false,
      },
    },
  },
})