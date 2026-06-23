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
import '@schema-form/platform-shared/styles/theme.scss'
import '@schema-form/platform-shared/styles/css-variables.scss'
import { registerMicroApps, start, initGlobalState } from 'qiankun'
import { APP_CONFIGS } from '@schema-form/platform-shared/qiankun/config'
import { useAuthStore } from '@/stores/auth'
import { setupElementPlus } from '@schema-form/platform-shared/config/element'

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
const shellBase = APP_CONFIGS.shell.basePath

// 激活规则：匹配 /{appName}/ 和 /standalone/{appName}/ 两种模式
// 必须与 router 的 path 规则一致：'/:app/*' 和 '/standalone/:app/*'
function makeActiveRule(appName: string): (location: Location) => boolean {
  return (location: Location) => {
    const path = location.pathname
    // 带菜单: /schema-platform/editor/...
    if (path.startsWith(`${shellBase}${appName}/`)) return true
    // 独立页签: /schema-platform/standalone/editor/...
    if (path.startsWith(`${shellBase}standalone/${appName}/`)) return true
    return false
  }
}

const microApps = Object.values(APP_CONFIGS)
  .filter((config) => config.name !== 'shell')
  .map((config) => ({
    name: config.name,
    entry: isDev
      ? `http://localhost:${config.devPort}${config.basePath}`
      : `${window.location.origin}${config.basePath}`,
    container: '#micro-container',
    activeRule: makeActiveRule(config.name),
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
  beforeUnmount: [
    (app) => {
      console.log(`[shell] before unmount ${app.name}`)
      return Promise.resolve()
    },
  ],
  afterUnmount: [
    (app) => {
      console.log(`[shell] after unmount ${app.name}`)
      return Promise.resolve()
    },
  ],
})

// 等待路由就绪后再启动 qiankun，避免 #micro-container 不存在的竞态
router.isReady().then(() => {
  console.log('[shell] starting qiankun', { microApps: microApps.map(m => m.name) })
  try {
    start({
      sandbox: {
        experimentalStyleIsolation: true,
      },
    })
    console.log('[shell] qiankun started')
  } catch (err: unknown) {
    console.error('[shell] qiankun start failed:', err)
  }
})
