import { ref } from 'vue'
import { useWidgetStore } from '../stores/widget'
import { useEditorStore } from '../stores/editor'
import { useBoardStore } from '../stores/board'
import { scaleDelta } from '../utils/coordinate'

/** 缩放手柄方向 */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

/**
 * useResize — 组件缩放逻辑
 *
 * 处理八向缩放手柄的拖拽，维护缩放状态，操作结束后推入历史。
 */
export function useResize() {
  const widgetStore = useWidgetStore()
  const editorStore = useEditorStore()
  const boardStore = useBoardStore()

  const isResizing = ref(false)
  const resizeWidgetId = ref<string | null>(null)
  const resizeHandle = ref<ResizeHandle | null>(null)
  const startX = ref(0)
  const startY = ref(0)
  const startW = ref(0)
  const startH = ref(0)

  /** 开始缩放 */
  function startResize(widgetId: string, handle: ResizeHandle, clientX: number, clientY: number) {
    const widget = widgetStore.findWidget(widgetId)
    if (!widget) return

    isResizing.value = true
    resizeWidgetId.value = widgetId
    resizeHandle.value = handle
    startX.value = clientX
    startY.value = clientY
    startW.value = widget.position?.w ?? 240
    startH.value = widget.position?.h ?? 40
  }

  /** 更新缩放（mousemove 时调用） */
  function updateResize(clientX: number, clientY: number) {
    if (!isResizing.value || !resizeWidgetId.value || !resizeHandle.value) return

    const zoom = boardStore.canvas.zoom
    const { dx, dy } = scaleDelta(clientX - startX.value, clientY - startY.value, zoom)

    const widget = widgetStore.findWidget(resizeWidgetId.value)
    if (!widget) return

    let newW = startW.value
    let newH = startH.value

    const handle = resizeHandle.value
    if (handle.includes('e')) newW = Math.max(20, startW.value + dx)
    if (handle.includes('w')) newW = Math.max(20, startW.value - dx)
    if (handle.includes('s')) newH = Math.max(20, startH.value + dy)
    if (handle.includes('n')) newH = Math.max(20, startH.value - dy)

    // 限制不超出画布边界
    const maxW = boardStore.canvas.width - (widget.position?.x ?? 0)
    const maxH = boardStore.canvas.height - (widget.position?.y ?? 0)
    newW = Math.min(newW, maxW)
    newH = Math.min(newH, maxH)

    widgetStore.resizeWidget(resizeWidgetId.value, newW, newH)
  }

  /** 结束缩放，推入历史 */
  function endResize() {
    if (isResizing.value && resizeWidgetId.value) {
      editorStore.pushHistory([...widgetStore.widgets])
    }
    isResizing.value = false
    resizeWidgetId.value = null
    resizeHandle.value = null
  }

  return {
    isResizing,
    startResize,
    updateResize,
    endResize,
  }
}
