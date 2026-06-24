import 'element-plus/dist/index.css'
import '@schema-form/platform-shared/styles/theme.scss'
import '@schema-form/platform-shared/styles/css-variables.scss'
import '@/styles/variables.scss'

import { createQiankunApp } from '@schema-form/platform-shared/qiankun/createQiankunApp'
import { useQiankun } from '@schema-form/platform-shared/qiankun'
import { setupElementPlus } from '@schema-form/platform-shared/config/element'

import App from './App.vue'
import { createEditorRouter } from './router'
import { configureApiClient } from './utils/apiClient'
import { registerAllWidgets } from './widgets'
import { permissionDirective } from './directives/permission'

// 全局注册 Widget（必须在 app 创建前完成）
registerAllWidgets()

const { getGlobalState } = useQiankun()
const router = createEditorRouter()

const { bootstrap: _bootstrap, mount: _mount, unmount } = createQiankunApp({
  name: 'editor',
  rootComponent: App,
  plugins: [router],
  getToken: () => {
    const state = getGlobalState()
    return (state.token as string) || null
  },
  extraSetup: (app) => {
    app.config.errorHandler = (err, _instance, info) => {
      console.error('[GlobalError]', err, info)
    }
    app.directive('permission', permissionDirective)
    setupElementPlus(app)
    configureApiClient({
      baseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
      getToken: () => {
        const state = getGlobalState()
        return (state.token as string) || localStorage.getItem('sfp_access_token') || ''
      },
      useMock: import.meta.env.VITE_USE_MOCK === 'true',
    })
  },
})

export async function bootstrap() {
  return _bootstrap()
}

/** mount 包装：处理 initialPath prop */
export async function mount(props: { container?: HTMLElement; initialPath?: string }) {
  await _mount(props)
  if (props.initialPath) {
    router.push(props.initialPath)
  }
}

export { unmount }
