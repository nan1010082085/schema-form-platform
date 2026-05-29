import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import microApp from '@micro-zoe/micro-app'

import App from './App.vue'
import router from './router'

// 初始化 micro-app
microApp.start()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
