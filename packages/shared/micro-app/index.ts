// ---- 类型 ----
export type {
  MicroAppConfig,
  MicroAppProps,
  MicroAppLifecycleEvent,
  MicroAppErrorEvent,
  ChildAppHooks,
  ChildAppOptions,
} from './types.js'

// ---- 事件类型 ----
export type {
  MicroAppEvents,
  EventType,
  EventMessage,
  EventHandler,
  CommunicationError,
  ErrorCallback,
  CommunicationOptions,
  ChildAppName,
  PortalToChildEvents,
  ChildToPortalEvents,
} from './events.js'

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
export {
  createChildApp,
  getMicroAppToken,
  getMicroAppAuthData,
  resolveToken,
  resolveMicroAppAuthData,
  type MicroAppAuthData,
} from './child.js'

// ---- 主题守卫 ----
export {
  applyThemeInline,
  installThemeWatchdog,
  EDITOR_THEME_VARS,
  FLOW_THEME_VARS,
  AI_THEME_VARS,
  type ThemeVars,
} from './themeGuard.js'

// ---- 统一通信 API ----
export {
  initCommunication,
  send,
  request,
  respond,
  on,
  once,
  off,
  destroy,
  sendToChild,
  requestFromChild,
  reportToPortal,
  listenFromPortal,
  respondToPortal,
} from './communication.js'
