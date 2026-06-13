import { createQiankunApp } from '@schema-form/shared-qiankun/createQiankunApp'
import { useQiankun } from '@schema-form/shared-qiankun'
import zhCN from 'tdesign-vue-next/esm/locale/zh_CN'

import App from './App.vue'
import { createAiRouter } from './router'
import { setTokenProvider } from './api/aiApi'

// 设置 token 提供者：从 qiankun 全局状态读取
const { getGlobalState } = useQiankun()
setTokenProvider(() => {
  const state = getGlobalState()
  return (state.token as string) || localStorage.getItem('sfp_access_token')
})

const router = createAiRouter()

const { bootstrap, mount, unmount } = createQiankunApp({
  name: 'ai',
  rootComponent: App,
  plugins: [router],
  tdesignConfig: {
    locale: zhCN,
    globalConfig: { size: 'medium' },
  },
  getToken: () => {
    const state = getGlobalState()
    return (state.token as string) || null
  },
})

export { bootstrap, mount, unmount }
