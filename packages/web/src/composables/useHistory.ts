/**
 * useHistory — Undo/Redo history composable
 *
 * Tracks schema changes as deep-cloned snapshots.
 * Configurable max history size (default 50).
 */
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { FormSchemaItem } from '@/components/FormGrid/types'

export interface UseHistoryOptions {
  maxSize?: number
}

export interface UseHistoryReturn {
  pushState: (schema: FormSchemaItem[]) => void
  undo: () => FormSchemaItem[] | null
  redo: () => FormSchemaItem[] | null
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  undoCount: Ref<number>
  redoCount: Ref<number>
  clear: () => void
}

export function useHistory(options: UseHistoryOptions = {}): UseHistoryReturn {
  const maxSize = options.maxSize ?? 50

  const history: FormSchemaItem[][] = []
  let pointer = -1

  const version = ref(0)

  const canUndo = computed(() => pointer > 0)
  const canRedo = computed(() => pointer < history.length - 1)
  const undoCount = computed(() => pointer)
  const redoCount = computed(() => {
    void version.value
    return history.length - 1 - pointer
  })

  function clone(schema: FormSchemaItem[]): FormSchemaItem[] {
    return JSON.parse(JSON.stringify(schema)) as FormSchemaItem[]
  }

  function pushState(schema: FormSchemaItem[]): void {
    const snapshot = clone(schema)

    // Drop any redo states beyond the current pointer
    if (pointer < history.length - 1) {
      history.splice(pointer + 1)
    }

    // Skip duplicate states
    if (history.length > 0 && JSON.stringify(history[pointer]) === JSON.stringify(snapshot)) {
      return
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

  function undo(): FormSchemaItem[] | null {
    if (!canUndo.value) return null
    pointer--
    version.value++
    return clone(history[pointer])
  }

  function redo(): FormSchemaItem[] | null {
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
