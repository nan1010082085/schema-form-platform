/**
 * postMessage 通信模块
 *
 * 提供跨窗口通信能力，用于 Editor ↔ Widget (iframe / micro-app) 之间的消息传递。
 */

export { PostMessageBridge } from './PostMessageBridge'
export { usePostMessage } from './usePostMessage'
export type {
  PostMessagePayload,
  PostMessageType,
  EditorToWidgetType,
  WidgetToEditorType,
  MessageHandler,
  PostMessageBridgeOptions,
  UsePostMessageOptions,
  UsePostMessageReturn,
} from './types'
