import type { App as VueApp, StyleValue } from 'vue'

// ---- 宿主侧 ----

/** micro-app 实例配置（useMicroApp composable 使用） */
export interface MicroAppConfig {
  /** 子应用名称（唯一标识） */
  name: string
  /** 子应用 URL */
  url: string
  /** 传递给子应用的数据 */
  data?: Record<string, unknown>
}

/** MicroApp 组件 Props */
export interface MicroAppProps {
  /** 子应用名称（唯一标识） */
  name: string
  /** 子应用 URL */
  url: string
  /** 传递给子应用的数据（默认 {}） */
  data?: Record<string, unknown>
  /** 是否使用 iframe 模式（默认 true） */
  iframe?: boolean
  /** 自定义容器样式 */
  style?: StyleValue
  /** 自定义 class */
  class?: string | Record<string, boolean> | Array<string | Record<string, boolean>>
}

/** micro-app 生命周期事件 */
export interface MicroAppLifecycleEvent {
  name: string
  appName: string
}

export interface MicroAppErrorEvent {
  name: string
  appName: string
  error: Error
}

// ---- 子应用侧 ----

/** 子应用生命周期钩子 */
export interface ChildAppHooks {
  /** 子应用 bootstrap 钩子 */
  bootstrap?: () => Promise<void>
  /** 子应用 mount 钩子（data 为宿主通过 micro-app data 属性传递的数据） */
  mount?: (data?: unknown) => Promise<void>
  /** 子应用 unmount 钩子 */
  unmount?: () => Promise<void>
}

/** 子应用创建选项 */
export interface ChildAppOptions extends ChildAppHooks {
  /** Vue 应用创建函数 */
  createApp: () => VueApp
  /** 挂载选择器（默认 '#app'） */
  selector?: string
  /** 路由实例（unmount 时重置） */
  router?: { replace: (path: string) => void }
  /**
   * 延迟获取路由实例（unmount 时调用）
   *
   * 用于 micro-app 模式下 router 在 createApp 回调内部创建的场景：
   * 模块顶层执行时 __MICRO_APP_ENVIRONMENT__ 尚未注入，无法判断 history 类型，
   * 因此必须将 router 创建延迟到 window.mount 触发时。
   * getRouter 在 unmount 阶段被调用，此时 router 已经通过 createApp 回调创建完毕。
   */
  getRouter?: () => { replace: (path: string) => void } | undefined
}

