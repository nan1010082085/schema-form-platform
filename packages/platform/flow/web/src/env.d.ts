/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface Window {
  __POWERED_BY_QIANKUN__?: boolean
  __FLOW_FORM_HOST__?: {
    onResponse?: (data: unknown) => void
    onEvent?: (data: unknown) => void
  }
}
