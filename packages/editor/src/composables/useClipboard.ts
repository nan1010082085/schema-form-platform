/**
 * useClipboard — 剪贴板操作 composable
 *
 * 优先使用 navigator.clipboard API，降级到 execCommand('copy')。
 * 自动通过 MessagePlugin 给出成功/失败反馈。
 */
import { MessagePlugin } from 'tdesign-vue-next'

export function useClipboard() {
  /**
   * 复制文本到剪贴板
   * @param text 要复制的文本
   * @param successMsg 成功提示（默认 '已复制'）
   */
  async function copy(text: string, successMsg = '已复制'): Promise<boolean> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
      } else {
        fallbackCopy(text)
      }
      MessagePlugin.success(successMsg)
      return true
    } catch {
      try {
        fallbackCopy(text)
        MessagePlugin.success(successMsg)
        return true
      } catch {
        MessagePlugin.error('复制失败')
        return false
      }
    }
  }

  function fallbackCopy(text: string): void {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    if (!ok) throw new Error('execCommand copy failed')
  }

  return { copy }
}
