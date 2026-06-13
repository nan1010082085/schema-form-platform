/**
 * 消息提示工具
 *
 * 适配 Element Plus ElMessage → TDesign MessagePlugin
 * 提供统一的消息提示接口
 */

import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'

export interface ConfirmOptions {
  title: string
  message: string
  type?: 'warning' | 'info' | 'danger' | 'success'
  confirmText?: string
  cancelText?: string
}

/**
 * 消息提示
 */
export const message = {
  success: (msg: string, duration = 3000) =>
    MessagePlugin.success(msg, duration),

  error: (msg: string, duration = 3000) =>
    MessagePlugin.error(msg, duration),

  warning: (msg: string, duration = 3000) =>
    MessagePlugin.warning(msg, duration),

  info: (msg: string, duration = 3000) =>
    MessagePlugin.info(msg, duration),

  loading: (msg: string, duration = 0) =>
    MessagePlugin.loading(msg, duration),

  closeAll: () => MessagePlugin.closeAll(),
}

/**
 * 确认对话框
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = DialogPlugin.confirm({
      header: options.title,
      body: options.message,
      theme: options.type || 'warning',
      confirmBtn: options.confirmText || '确定',
      cancelBtn: options.cancelText || '取消',
      onConfirm: () => {
        resolve(true)
        dialog.destroy()
      },
      onClose: () => {
        resolve(false)
        dialog.destroy()
      },
    })
  })
}

/**
 * 警告确认对话框
 */
export function confirmWarning(title: string, message: string): Promise<boolean> {
  return confirm({ title, message, type: 'warning' })
}

/**
 * 危险操作确认对话框
 */
export function confirmDanger(title: string, message: string): Promise<boolean> {
  return confirm({ title, message, type: 'danger' })
}

/**
 * 异步消息（自动显示 loading → success/error）
 */
export async function asyncMessage<T>(
  promise: Promise<T>,
  {
    loading: loadingMsg = '处理中...',
    success: successMsg = '操作成功',
    error: errorMsg = '操作失败',
  }: {
    loading?: string
    success?: string | ((result: T) => string)
    error?: string | ((err: Error) => string)
  } = {}
): Promise<T> {
  const loadingId = MessagePlugin.loading(loadingMsg, 0)

  try {
    const result = await promise
    MessagePlugin.close(loadingId)
    const msg = typeof successMsg === 'function' ? successMsg(result) : successMsg
    MessagePlugin.success(msg)
    return result
  } catch (err) {
    MessagePlugin.close(loadingId)
    const msg = typeof errorMsg === 'function'
      ? errorMsg(err as Error)
      : errorMsg
    MessagePlugin.error(msg)
    throw err
  }
}
