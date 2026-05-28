import { createApp } from 'vue'
import type { App as VueApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@/styles/variables.scss'
import '@/styles/theme.scss'

import App from './App.vue'
import router from './router'
import { configureApiClient } from './utils/apiClient'
import { registerAllWidgets } from './widgets'

let app: VueApp | null = null

function render(props?: Record<string, unknown>) {
  const container = props?.container as HTMLElement | undefined
  app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  app.use(ElementPlus)
  registerAllWidgets()

  configureApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
    useMock: import.meta.env.VITE_USE_MOCK === 'true',
  })

  app.mount(container ? container.querySelector('#app') || container : '#app')
}

// Standalone mode — render directly
if (!window.__MICRO_APP_ENVIRONMENT__) {
  render()
}

// micro-app lifecycle hooks
export async function bootstrap() {}

export async function mount(props: Record<string, unknown>) {
  render(props)
}

export async function unmount() {
  app?.unmount()
  app = null
  router.replace('/')
}
