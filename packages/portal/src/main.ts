import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@schema-form/shared-styles/tokens.css'
import '@schema-form/shared-styles/theme'
import { elementPlusConfig, elementPlusSize } from '@schema-form/shared-config/elementPlus'
import { initMicroApp, preFetchApps } from '@schema-form/micro-app/host'
import { getAppUrl } from '@schema-form/micro-app/config'

import App from './App.vue'
import router from './router'

initMicroApp()

// 生产环境预加载子应用，开发环境跳过（避免缓存旧版本）
if (!import.meta.env.DEV) {
  preFetchApps([
    { name: 'editor', url: getAppUrl('editor', false), iframe: true },
    { name: 'flow',   url: getAppUrl('flow',   false), iframe: true },
    { name: 'ai',     url: getAppUrl('ai',     false), iframe: true },
  ])
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { ...elementPlusConfig, size: elementPlusSize })
app.mount('#app')
