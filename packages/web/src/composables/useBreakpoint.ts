/**
 * useBreakpoint — 响应式断点检测 composable
 *
 * 使用 matchMedia API（非 resize 事件）监听视口宽度变化。
 * 断点定义与 Element Plus 保持一致（mobile-first）。
 * SSR 安全：在非浏览器环境下默认返回 'xxl'。
 */
import { ref, computed, onUnmounted, type ComputedRef } from 'vue'
import type { ResponsiveSpan } from '@/components/FormGrid/types'

/** 断点名称，从小到大排列 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

/** 断点像素阈值（mobile-first，值为该断点的 min-width） */
const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
}

/** 断点顺序（从大到小用于匹配） */
const BREAKPOINT_ORDER: Breakpoint[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs']

/**
 * 创建响应式断点检测器
 *
 * @returns 包含当前断点和 resolveSpan 工具函数的 composable
 */
export function useBreakpoint(): {
  breakpoint: ComputedRef<Breakpoint>
  resolveSpan: (span: number | ResponsiveSpan) => number
} {
  const currentBreakpoint = ref<Breakpoint>('xxl')

  // SSR 安全：非浏览器环境跳过 matchMedia
  const isBrowser = typeof window !== 'undefined'
  const mqlList: MediaQueryList[] = []
  const handlers: Array<(e: MediaQueryListEvent) => void> = []

  if (isBrowser) {
    // 从大到小创建 matchMedia 查询，第一个匹配的即为当前断点
    for (const bp of BREAKPOINT_ORDER) {
      const minWidth = BREAKPOINTS[bp]
      const mql = window.matchMedia(`(min-width: ${minWidth}px)`)
      mqlList.push(mql)

      const handler = () => {
        // 重新计算：找到第一个匹配的断点
        for (const checkBp of BREAKPOINT_ORDER) {
          const checkMql = window.matchMedia(`(min-width: ${BREAKPOINTS[checkBp]}px)`)
          if (checkMql.matches) {
            currentBreakpoint.value = checkBp
            return
          }
        }
        currentBreakpoint.value = 'xs'
      }

      mql.addEventListener('change', handler)
      handlers.push(handler)
    }

    // 初始化：立即计算一次
    for (const bp of BREAKPOINT_ORDER) {
      if (window.matchMedia(`(min-width: ${BREAKPOINTS[bp]}px)`).matches) {
        currentBreakpoint.value = bp
        break
      }
    }
  }

  // 组件卸载时自动清理监听器
  onUnmounted(() => {
    for (let i = 0; i < mqlList.length; i++) {
      mqlList[i].removeEventListener('change', handlers[i])
    }
  })

  const breakpoint = computed(() => currentBreakpoint.value)

  /**
   * 解析响应式 span 值
   * - span 为 number 时直接返回
   * - span 为 ResponsiveSpan 时，从当前断点向上查找最近的定义值
   * - 无匹配时默认返回 24
   */
  function resolveSpan(span: number | ResponsiveSpan): number {
    if (typeof span === 'number') return span

    // 从当前断点向上查找（mobile-first 策略）
    const bpOrderAsc: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']
    const currentIdx = bpOrderAsc.indexOf(currentBreakpoint.value)

    // 从当前断点向大断点方向查找
    for (let i = currentIdx; i < bpOrderAsc.length; i++) {
      const val = span[bpOrderAsc[i]]
      if (val !== undefined) return val
    }

    // 向小断点方向查找（回退）
    for (let i = currentIdx - 1; i >= 0; i--) {
      const val = span[bpOrderAsc[i]]
      if (val !== undefined) return val
    }

    return 24
  }

  return { breakpoint, resolveSpan }
}
