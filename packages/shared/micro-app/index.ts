// ---- 类型 ----
export type {
  MicroAppConfig,
  MicroAppProps,
  MicroAppLifecycleEvent,
  MicroAppErrorEvent,
  ChildAppHooks,
  ChildAppOptions,
  BridgeMessage,
} from './types.js'

// ---- 配置 ----
export {
  APP_CONFIGS,
  API_PORT,
  getAppUrl,
  getApiProxyTarget,
  type AppName,
  type AppConfig,
} from './config.js'

// ---- 宿主侧 ----
export { initMicroApp, useMicroApp, type MicroAppStatus } from './host.js'
export { default as MicroApp } from './MicroApp.vue'

// ---- 子应用侧 ----
export { createChildApp } from './child.js'

// ---- 通信桥 ----
export { bridgeSend, bridgeOn, bridgeOff, bridgeDestroy } from './bridge.js'
