/**
 * AI 抽屉独立入口
 *
 * 不走路由，直接挂载 AiSidebarView。
 * 供 Editor / Flow 通过 micro-app 或 iframe 嵌入。
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './global.css'
import { createChildApp } from '@schema-form/micro-app/child'

import AiSidebarView from './views/AiSidebarView.vue'

createChildApp({
  createApp: () => {
    const app = createApp(AiSidebarView)
    app.use(createPinia())
    app.use(ElementPlus)
    return app
  },
})
