/**
 * useFlowThumbnail — 截取 VueFlow 画布缩略图
 *
 * 通过 html-to-image 将 VueFlow DOM 转为 base64 PNG。
 * 降级方案：若库不可用则返回空字符串。
 */
import { toPng } from 'html-to-image'

/**
 * 截取指定 DOM 元素为 PNG base64 字符串
 * @param el - VueFlow 容器 DOM 元素
 * @param options - 可选配置
 * @returns base64 data URI，失败时返回空字符串
 */
export async function captureThumbnail(
  el: HTMLElement | null | undefined,
  options?: { width?: number; height?: number; quality?: number },
): Promise<string> {
  if (!el) return ''

  try {
    const dataUrl = await toPng(el, {
      width: options?.width ?? 400,
      height: options?.height ?? 250,
      pixelRatio: 1,
      backgroundColor: '#ffffff',
      filter: (node: HTMLElement) => {
        // 排除 Controls、MiniMap 等 UI 控件
        const cls = node?.classList
        if (!cls) return true
        if (cls.contains('vue-flow__controls')) return false
        if (cls.contains('vue-flow__minimap')) return false
        if (cls.contains('vue-flow__attribution')) return false
        return true
      },
    })
    return dataUrl
  } catch {
    return ''
  }
}
