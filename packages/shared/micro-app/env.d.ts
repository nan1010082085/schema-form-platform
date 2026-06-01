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
