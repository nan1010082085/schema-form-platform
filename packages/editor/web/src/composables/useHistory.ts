/**
 * useHistory — Undo/Redo history composable
 *
 * Tracks schema changes as deep-cloned snapshots.
 * Configurable max history size (default 50).
 */
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { PartialWidget } from '@/components/WidgetRenderer/types'

export interface UseHistoryOptions {
  maxSize?: number
}

export interface UseHistoryReturn {
  pushState: (schema: PartialWidget[]) => void
  undo: () => PartialWidget[] | null
  redo: () => PartialWidget[] | null
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  undoCount: Ref<number>
  redoCount: Ref<number>
  clear: () => void
}

/**
 * 深拷贝 — 使用 JSON 序列化。
 * structuredClone 无法处理 Vue reactive proxy 对象，因此统一使用 JSON 方式。
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function useHistory(options: UseHistoryOptions = {}): UseHistoryReturn {
  const maxSize = options.maxSize ?? 50

  const history: PartialWidget[][] = []
  let pointer = -1

  const version = ref(0)

  const canUndo = computed(() => pointer > 0)
  const canRedo = computed(() => pointer < history.length - 1)
  const undoCount = computed(() => pointer)
  const redoCount = computed(() => {
    void version.value
    return history.length - 1 - pointer
  })

  function clone(schema: PartialWidget[]): PartialWidget[] {
    return deepClone(schema)
  }

  function pushState(schema: PartialWidget[]): void {
    const snapshot = clone(schema)

    // Drop any redo states beyond the current pointer
    if (pointer < history.length - 1) {
      history.splice(pointer + 1)
    }

    // Skip duplicate states — use fast structural comparison
    if (history.length > 0) {
      const current = history[pointer]
      if (current.length === snapshot.length && JSON.stringify(current) === JSON.stringify(snapshot)) {
        return
      }
    }

    history.push(snapshot)
    pointer = history.length - 1

    // Trim history if it exceeds maxSize
    if (history.length > maxSize) {
      const excess = history.length - maxSize
      history.splice(0, excess)
      pointer -= excess
    }

    version.value++
  }

  function undo(): PartialWidget[] | null {
    if (!canUndo.value) return null
    pointer--
    version.value++
    return clone(history[pointer])
  }

  function redo(): PartialWidget[] | null {
    if (!canRedo.value) return null
    pointer++
    version.value++
    return clone(history[pointer])
  }

  function clear(): void {
    history.length = 0
    pointer = -1
    version.value++
  }

  return {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    clear,
  }
}
