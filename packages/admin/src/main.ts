import { createQiankunApp } from '@schema-form/shared-qiankun/createQiankunApp'
import 'element-plus/dist/index.css'
import '@schema-form/shared-styles/theme.scss'
import '@schema-form/shared-styles/css-variables.scss'
import './styles/theme.scss'
import App from './App.vue'
import router from './router'
import { setTokenProvider } from './utils/apiClient'
import { permissionDirective } from './directives/permission'
import { setupElementPlus } from '@schema-form/shared-config/element'

// 设置 token 提供者
const TOKEN_KEY = 'sfp_access_token'
function resolveToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
setTokenProvider(() => resolveToken())

// 创建 Qiankun 子应用
const { bootstrap, mount, unmount } = createQiankunApp({
  name: 'admin',
  rootComponent: App,
  plugins: [router],
  extraSetup: (app) => {
    setupElementPlus(app)
    app.directive('permission', permissionDirective)
  },
})

export { bootstrap, mount, unmount }
