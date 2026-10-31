/**
 * [前端 · 应用入口] 把 <App/> 挂载到 index.html 的 #root。
 *
 * StrictMode 仅开发环境生效，用来暴露副作用问题。
 *
 * 后端关联：不请求接口。
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)