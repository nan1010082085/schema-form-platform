import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { resolveToken } from '@schema-form/micro-app/child'
import router from './router'
import App from './App.vue'
import { setTokenProvider } from './utils/apiClient'

// 注入 token 提供者：优先 localStorage（standalone），其次 micro-app data（微前端）
setTokenProvider(() => resolveToken())

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
