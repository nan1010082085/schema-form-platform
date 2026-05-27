import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@/styles/variables.scss'
import '@/styles/theme.scss'

import App from './App.vue'
import router from './router'
import { configureApiClient } from './utils/apiClient'
import { registerAllWidgets } from './widgets'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)
registerAllWidgets()

// 初始化 Schema API 客户端
configureApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
  useMock: import.meta.env.VITE_USE_MOCK === 'true',
})

app.mount('#app')
