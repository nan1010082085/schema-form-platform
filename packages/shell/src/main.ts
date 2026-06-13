/**
 * Shell main entry
 *
 * Initializes:
 * 1. Vue app with Pinia + Router + TDesign
 * 2. Qiankun micro-frontend (register + start)
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/dist/tdesign.css'
import '@schema-form/shared-styles/tokens.css'
import { registerMicroApps, start } from 'qiankun'
import { APP_CONFIGS } from '@schema-form/shared-qiankun/config'

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(TDesign)
app.mount('#app')

// Register micro-apps after Vue app is mounted
const isDev = import.meta.env.DEV

const microApps = Object.values(APP_CONFIGS)
  .filter((config) => config.name !== 'shell') // Exclude shell (it's the host itself)
  .map((config) => ({
    name: config.name,
    entry: isDev
      ? `//localhost:${config.devPort}${config.basePath}`
      : `//${window.location.host}${config.basePath}`,
    container: '#micro-container',
    activeRule: config.basePath,
  }))

registerMicroApps(microApps, {
  beforeLoad: [
    (app) => {
      console.log(`[shell] before load ${app.name}`)
      return Promise.resolve()
    },
  ],
  beforeMount: [
    (app) => {
      console.log(`[shell] before mount ${app.name}`)
      return Promise.resolve()
    },
  ],
  afterMount: [
    (app) => {
      console.log(`[shell] after mount ${app.name}`)
      return Promise.resolve()
    },
  ],
})

start({
  sandbox: {
    strictStyleIsolation: true,
    experimentalStyleIsolation: false,
  },
  prefetch: 'all',
})
