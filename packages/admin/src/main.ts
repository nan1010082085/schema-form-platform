import { createQiankunApp } from '@schema-form/shared-qiankun/createQiankunApp'
import { useQiankun } from '@schema-form/shared-qiankun'
import App from './App.vue'
import router from './router'
import { setTokenProvider } from './utils/apiClient'

// 设置 token 提供者：从 qiankun 全局状态读取
const { getGlobalState } = useQiankun()
setTokenProvider(() => {
  const state = getGlobalState()
  return (state.token as string) || localStorage.getItem('sfp_access_token')
})

const { bootstrap, mount, unmount } = createQiankunApp({
  name: 'admin',
  rootComponent: App,
  plugins: [router],
})

export { bootstrap, mount, unmount }
