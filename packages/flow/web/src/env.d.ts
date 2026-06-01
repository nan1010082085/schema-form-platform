/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface Window {
  __MICRO_APP_ENVIRONMENT__?: boolean
  __FLOW_FORM_HOST__?: {
    onResponse?: (data: unknown) => void
    onEvent?: (data: unknown) => void
  }
}
