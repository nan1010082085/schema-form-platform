/**
 * Shell main entry
 *
 * Initializes:
 * 1. Vue app with Pinia + Router + Element Plus
 * 2. Qiankun micro-frontend (register + start)
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import '@schema-form/shared-styles/theme.scss'
import '@schema-form/shared-styles/css-variables.scss'
import { registerMicroApps, start, initGlobalState } from 'qiankun'
import { APP_CONFIGS } from '@schema-form/shared-qiankun/config'
import { useAuthStore } from '@/stores/auth'
import { setupElementPlus } from '@schema-form/shared-config/element'

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
setupElementPlus(app)
app.mount('#app')

// 初始化 qiankun 全局状态
const initialState = { token: localStorage.getItem('sfp_access_token') || '' }
const actions = initGlobalState(initialState)

// 同步 token 到 qiankun 全局状态
const authStore = useAuthStore()
authStore.$subscribe((_mutation, state) => {
  actions.setGlobalState({ token: state.token || '' })
})

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

// 等待路由就绪后再启动 qiankun，避免 #micro-container 不存在的竞态
router.isReady().then(() => {
  start({
    sandbox: {
      strictStyleIsolation: true,
      experimentalStyleIsolation: false,
    },
    // 不用 prefetch: 'all'，避免在组件挂载前就加载子应用
  })
})
