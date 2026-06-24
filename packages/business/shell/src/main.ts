/**
 * Shell main entry
 *
 * Initializes:
 * 1. Vue app with Pinia + Router + Element Plus
 * 2. Qiankun global state (token sync)
 * 3. Fetches micro-app configs from backend
 *
 * Micro-apps are mounted per-layout via loadMicroApp (not registerMicroApps).
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import '@schema-form/platform-shared/styles/theme.scss'
import '@schema-form/platform-shared/styles/css-variables.scss'
import { initGlobalState } from 'qiankun'
import { useAuthStore } from '@/stores/auth'
import { useMicroAppStore } from '@/stores/microApp'
import { setupElementPlus } from '@schema-form/platform-shared/config/element'

import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
setupElementPlus(app)
app.mount('#app')

// Initialize qiankun global state (token sync)
const initialState = { token: localStorage.getItem('sfp_access_token') || '' }
const actions = initGlobalState(initialState)

const authStore = useAuthStore()
authStore.$subscribe((_mutation, state) => {
  actions.setGlobalState({ token: state.token || '' })
})

// Fetch micro-app configurations from backend
const microAppStore = useMicroAppStore()
microAppStore.fetchApps().catch((err: unknown) => {
  console.error('[shell] Failed to fetch micro-app configs:', err)
})
