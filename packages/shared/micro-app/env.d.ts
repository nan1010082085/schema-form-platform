/**
 * Ambient type declarations for @micro-zoe/micro-app
 *
 * 该包没有自带模块声明，此处补充最小化类型。
 * 仅宿主侧（host.ts）需要此声明，子应用侧不依赖。
 */
declare module '@micro-zoe/micro-app' {
  interface MicroApp {
    start(options?: Record<string, unknown>): void
  }
  const microApp: MicroApp
  export default microApp
}

/** micro-app 子应用全局对象 */
interface MicroAppInstance {
  getData(): Record<string, unknown> | undefined
  addDataListener(handler: (data: Record<string, unknown>) => void): void
  removeDataListener(handler: (data: Record<string, unknown>) => void): void
}

declare global {
  interface Window {
    __MICRO_APP_ENVIRONMENT__?: boolean
    __MICRO_APP_NAME__?: string
    microApp?: MicroAppInstance
  }
}
