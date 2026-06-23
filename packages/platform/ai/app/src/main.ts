/**
 * AI 应用主入口
 *
 * 独立运行时使用路由，展示所有配置页面。
 * qiankun 模式下使用 AiSidebarView。
 */

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@schema-form/platform-shared/styles/theme.scss'
import '@schema-form/platform-shared/styles/css-variables.scss'

import App from './App.vue'
import { createAiRouter } from './router'
import { setupElementPlus } from '@schema-form/platform-shared/config/element'
import { setTokenProvider } from './api/aiApi'

// 设置 token 提供者
setTokenProvider(() => localStorage.getItem('sfp_access_token'))

// 创建应用
const app = createApp(App)

// 设置 Element Plus
setupElementPlus(app)

// 创建路由
const router = createAiRouter()
app.use(router)

// 挂载应用
app.mount('#app')

// 导出 qiankun 生命周期（如果需要）
export function bootstrap() {
  console.log('[ai] bootstrap')
}

export function mount() {
  console.log('[ai] mount')
}

export function unmount() {
  console.log('[ai] unmount')
}
