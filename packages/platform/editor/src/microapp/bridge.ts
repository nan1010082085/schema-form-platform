/**
 * microapp bridge — iframe/postMessage 通信桥
 */

/** 向宿主窗口发送消息 */
export function sendToHost(data: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
    window.parent.postMessage(data, '*')
  }
}
