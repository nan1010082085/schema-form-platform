/**
 * micro-app 通信桥接
 *
 * micro-app 框架下子应用与宿主在同一 window 上下文，
 * window.parent.postMessage 无法工作。
 * 此模块将 postMessage 调用重定向到全局回调函数。
 */

export interface HostCallbacks {
  onResponse?: (data: unknown) => void
  onEvent?: (data: unknown) => void
}

declare global {
  interface Window {
    __MICRO_APP_ENVIRONMENT__?: boolean
    __FLOW_FORM_HOST__?: HostCallbacks
  }
}

/**
 * 在子应用侧调用：将消息发送到宿主
 * iframe 场景走 postMessage，micro-app 场景走全局回调
 */
export function sendToHost(message: unknown) {
  if (window.__MICRO_APP_ENVIRONMENT__ && window.__FLOW_FORM_HOST__) {
    window.__FLOW_FORM_HOST__.onResponse?.(message)
  } else {
    window.parent?.postMessage(message, '*')
  }
}

/**
 * 在子应用侧调用：发送事件到宿主
 */
export function emitToHost(message: unknown) {
  if (window.__MICRO_APP_ENVIRONMENT__ && window.__FLOW_FORM_HOST__) {
    window.__FLOW_FORM_HOST__.onEvent?.(message)
  } else {
    window.parent?.postMessage(message, '*')
  }
}
