/**
 * 消息提示工具
 *
 * 基于 Element Plus ElMessage / ElMessageBox
 * 提供统一的消息提示接口
 */

import { ElMessage, ElMessageBox } from 'element-plus'

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
    ElMessage.success({ message: msg, duration }),

  error: (msg: string, duration = 3000) =>
    ElMessage.error({ message: msg, duration }),

  warning: (msg: string, duration = 3000) =>
    ElMessage.warning({ message: msg, duration }),

  info: (msg: string, duration = 3000) =>
    ElMessage.info({ message: msg, duration }),

  loading: (msg: string, duration = 0) =>
    ElMessage({ message: msg, type: 'info', duration, showClose: false }),

  closeAll: () => ElMessage.closeAll(),
}

/**
 * 确认对话框
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return ElMessageBox.confirm(
    options.message,
    options.title,
    {
      type: (options.type || 'warning') as 'warning' | 'info' | 'success' | 'error',
      confirmButtonText: options.confirmText || '确定',
      cancelButtonText: options.cancelText || '取消',
    },
  )
    .then(() => true)
    .catch(() => false)
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
  const loadingInstance = ElMessage({ message: loadingMsg, type: 'info', duration: 0, showClose: false })

  try {
    const result = await promise
    loadingInstance.close()
    const msg = typeof successMsg === 'function' ? successMsg(result) : successMsg
    ElMessage.success(msg)
    return result
  } catch (err) {
    loadingInstance.close()
    const msg = typeof errorMsg === 'function'
      ? errorMsg(err as Error)
      : errorMsg
    ElMessage.error(msg)
    throw err
  }
}
