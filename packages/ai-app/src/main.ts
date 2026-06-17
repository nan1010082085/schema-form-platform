import { createQiankunApp } from '@schema-form/shared-qiankun/createQiankunApp'
import { useQiankun } from '@schema-form/shared-qiankun'
import 'element-plus/dist/index.css'
import '@schema-form/shared-styles/theme.scss'
import '@schema-form/shared-styles/css-variables.scss'

import AiSidebarView from './views/AiSidebarView.vue'
import { setTokenProvider } from './api/aiApi'
import { setupElementPlus } from '@schema-form/shared-config/element'

// 设置 token 提供者：从 qiankun 全局状态读取
const { getGlobalState } = useQiankun()
setTokenProvider(() => {
  const state = getGlobalState()
  return (state.token as string) || localStorage.getItem('sfp_access_token')
})

const { bootstrap, mount, unmount } = createQiankunApp({
  name: 'ai',
  rootComponent: AiSidebarView,
  extraSetup: (app) => {
    setupElementPlus(app)
  },
  getToken: () => {
    const state = getGlobalState()
    return (state.token as string) || null
  },
})

export { bootstrap, mount, unmount }
