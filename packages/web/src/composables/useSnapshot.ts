import { ref } from 'vue'
import { toPng } from 'html-to-image'

export function useSnapshot() {
  const isCapturing = ref(false)

  /**
   * 将 DOM 元素截取为 PNG base64 data URL。
   *
   * @param el         - 目标 DOM 元素
   * @param pixelRatio - 分辨率倍率，默认 0.2（低分辨率）
   * @returns data:image/png;base64,... 截图失败返回空字符串
   */
  async function captureElement(el: HTMLElement, pixelRatio = 0.2): Promise<string> {
    isCapturing.value = true
    try {
      const dataUrl = await toPng(el, {
        pixelRatio,
        skipFonts: true,
      })
      return dataUrl
    } catch (err) {
      console.error('[useSnapshot] capture failed:', err)
      return ''
    } finally {
      isCapturing.value = false
    }
  }

  return { isCapturing, captureElement }
}
