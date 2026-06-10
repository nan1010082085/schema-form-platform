/**
 * useChartLazyInit — 图表懒加载 composable
 *
 * 使用 IntersectionObserver 监听图表容器是否进入视口。
 * 进入视口后才初始化 ECharts，避免大量图表组件同时初始化导致性能问题。
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export function useChartLazyInit(containerRef: Ref<HTMLElement | undefined>) {
  const isVisible = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!containerRef.value) return

    // jsdom (test env) 不支持 IntersectionObserver，直接标记为可见
    if (typeof IntersectionObserver === 'undefined') {
      isVisible.value = true
      return
    }

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            isVisible.value = true
            // 一旦可见就停止观察，不需要持续监听
            observer?.disconnect()
            observer = null
            break
          }
        }
      },
      {
        // 提前 200px 开始加载，避免用户看到空白区域
        rootMargin: '200px',
        threshold: 0,
      },
    )

    observer.observe(containerRef.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  return { isVisible }
}
