import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import '@schema-form/shared-styles/theme.scss'
import '@schema-form/shared-styles/css-variables.scss'

import { setupElementPlus } from '@schema-form/shared-config/element'

import '@/styles/variables.scss'

import App from './App.vue'
import { createEditorRouter } from './router'
import { configureApiClient } from './utils/apiClient'
import { registerAllWidgets } from './widgets'
import { permissionDirective } from './directives/permission'

// ============================================================
// Token 解析
// ============================================================
const TOKEN_KEY = 'sfp_access_token'

/** 统一 token 解析：优先 localStorage（standalone），其次 qiankun props（微前端） */
function resolveToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

// ============================================================
// Vue 应用工厂
// ============================================================
let router: ReturnType<typeof createEditorRouter>

function createEditorApp() {
  router = createEditorRouter()
  const app = createApp(App)
  const pinia = createPinia()

  // 全局错误边界：捕获未被 ErrorBoundary 组件处理的运行时错误
  app.config.errorHandler = (err, _instance, info) => {
    console.error('[GlobalError]', err, info)
    // 后续可接入错误上报服务
  }

  app.use(pinia)
  app.use(router)
  setupElementPlus(app)
  app.directive('permission', permissionDirective)
  registerAllWidgets()

  configureApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
    getToken: () => resolveToken() ?? '',
    useMock: import.meta.env.VITE_USE_MOCK === 'true',
  })

  return app
}

// ============================================================
// Qiankun 生命周期
// ============================================================
let app: ReturnType<typeof createApp> | null = null

declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean
  }
}

// 独立运行时直接挂载
if (!window.__POWERED_BY_QIANKUN__) {
  app = createEditorApp()
  app.mount('#app')
}

/** Qiankun 生命周期钩子 */
export async function bootstrap() {
  console.log('[editor-web] bootstrap')
}

export async function mount(props: { container?: HTMLElement }) {
  console.log('[editor-web] mount', props)
  app = createEditorApp()
  const container = props.container
  const mountEl = container?.querySelector('#app') ?? container ?? document.getElementById('app')!
  app.mount(mountEl)
}

export async function unmount() {
  console.log('[editor-web] unmount')
  if (app) {
    app.unmount()
    app = null
  }
  router?.replace('/')
}
