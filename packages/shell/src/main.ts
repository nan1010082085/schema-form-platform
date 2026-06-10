/**
 * Shell main entry
 *
 * Initializes:
 * 1. micro-app engine (for child app loading)
 * 2. Vue app with Pinia + Router + Element Plus
 * 3. Pre-fetches child apps in production
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { initMicroApp, preFetchApps } from '@schema-form/micro-app/host'
import { getAppUrl } from '@schema-form/micro-app/config'

import App from './App.vue'
import router from './router'

// Initialize micro-app engine (start + style guard)
initMicroApp()

// Pre-fetch child apps in production (skip in dev to avoid stale cache)
if (!import.meta.env.DEV) {
  preFetchApps([
    { name: 'editor', url: getAppUrl('editor', false), iframe: true },
    { name: 'flow', url: getAppUrl('flow', false), iframe: true },
    { name: 'ai', url: getAppUrl('ai', false), iframe: true },
  ])
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { size: 'large' })
app.mount('#app')
