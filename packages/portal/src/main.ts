import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { initMicroApp } from '@schema-form/micro-app/host'

import App from './App.vue'
import router from './router'

initMicroApp()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { size: 'large' })
app.mount('#app')
