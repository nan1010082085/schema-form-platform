/**
 * micro-app 通信桥接
 *
 * sandbox 模式下子应用运行在 iframe 中，通过 postMessage 与宿主通信。
 */

declare global {
  interface Window {
    __MICRO_APP_ENVIRONMENT__?: boolean
  }
}

/** 向宿主发送消息（通过 postMessage） */
export function sendToHost(message: unknown) {
  window.parent?.postMessage(message, '*')
}

/** 向宿主发送事件（通过 postMessage） */
export function emitToHost(message: unknown) {
  window.parent?.postMessage(message, '*')
}
