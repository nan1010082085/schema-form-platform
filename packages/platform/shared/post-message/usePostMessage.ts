/**
 * usePostMessage — postMessage 通信 Vue Composable
 *
 * 封装 PostMessageBridge，在组件卸载时自动清理。
 */
import { watch, onUnmounted, isRef, type Ref } from 'vue'
import { PostMessageBridge } from './PostMessageBridge'
import type {
  PostMessagePayload,
  PostMessageBridgeOptions,
  PostMessageType,
  UsePostMessageOptions,
} from './types'

export interface UsePostMessageReturn {
  /** 发送消息到目标窗口 */
  send: (target: Window | HTMLElement, type: PostMessageType, data?: unknown, targetOrigin?: string) => void
  /** 监听指定类型的消息 */
  on: (type: PostMessageType, handler: (payload: PostMessagePayload) => void) => void
  /** 移除指定类型的消息监听 */
  off: (type: PostMessageType, handler: (payload: PostMessagePayload) => void) => void
  /** 一次性监听指定类型的消息 */
  once: (type: PostMessageType, handler: (payload: PostMessagePayload) => void) => void
  /** 销毁通信桥接实例 */
  destroy: () => void
}

/**
 * 创建 postMessage 通信实例
 *
 * @param target - 监听的 Window 对象（默认当前 window）
 * @param options - 配置选项
 * @returns 通信方法集合
 */
export function usePostMessage(
  target?: Ref<Window | null> | Window,
  options?: UsePostMessageOptions,
): UsePostMessageReturn {
  let bridge: PostMessageBridge | null = null

  function createBridge(listenTarget?: Window): PostMessageBridge {
    const opts: PostMessageBridgeOptions = {
      allowedOrigin: options?.origin,
      listenTarget,
    }
    return new PostMessageBridge(opts)
  }

  // 初始化：如果 target 是一个具体的 Window，立即创建
  if (target && !isRef(target)) {
    bridge = createBridge(target)
  }

  // 如果 target 是 Ref，监听其变化
  if (target && isRef(target)) {
    watch(target, (newTarget, _oldTarget, onCleanup) => {
      bridge?.destroy()
      if (newTarget) {
        bridge = createBridge(newTarget)
      }
      onCleanup(() => {
        bridge?.destroy()
      })
    }, { immediate: true })
  }

  // 组件卸载时清理
  onUnmounted(() => {
    bridge?.destroy()
  })

  return {
    send(target, type, data, targetOrigin) {
      bridge?.send(target, type, data, targetOrigin)
    },
    on(type, handler) {
      bridge?.on(type, handler)
    },
    off(type, handler) {
      bridge?.off(type, handler)
    },
    once(type, handler) {
      bridge?.once(type, handler)
    },
    destroy() {
      bridge?.destroy()
      bridge = null
    },
  }
}
