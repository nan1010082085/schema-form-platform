/**
 * postMessage 通信协议类型定义
 *
 * 定义 Editor ↔ Widget (iframe / micro-app) 之间的消息格式与类型枚举。
 */

// ── 消息载荷 ──

/** postMessage 统一消息格式 */
export interface PostMessagePayload {
  /** 消息类型（必须） */
  type: PostMessageType
  /** 消息数据 */
  data?: unknown
  /** 来源标识（widget ID） */
  source?: string
  /** 时间戳（毫秒） */
  timestamp?: number
}

// ── 消息类型枚举 ──

/** Editor → Widget 方向的消息类型 */
export type EditorToWidgetType =
  | 'fg:set-data'
  | 'fg:get-data'
  | 'fg:validate'
  | 'fg:submit'
  | 'fg:set-mode'

/** Widget → Editor 方向的消息类型 */
export type WidgetToEditorType =
  | 'fg:data-response'
  | 'fg:validation-result'
  | 'fg:ready'

/** 所有合法消息类型的联合 */
export type PostMessageType = EditorToWidgetType | WidgetToEditorType

// ── 消息处理器 ──

/** 消息回调函数签名 */
export type MessageHandler = (payload: PostMessagePayload) => void

// ── 桥接配置 ──

/** PostMessageBridge 构造选项 */
export interface PostMessageBridgeOptions {
  /** 限制只接受来自指定 origin 的消息（安全校验） */
  allowedOrigin?: string
  /** 消息来源 Window（默认 window） */
  listenTarget?: Window
}

// ── Vue Composable 选项 ──

/** usePostMessage 选项 */
export interface UsePostMessageOptions {
  /** 限制只接受来自指定 origin 的消息 */
  origin?: string
}
