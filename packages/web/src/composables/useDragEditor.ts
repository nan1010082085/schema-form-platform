/**
 * useDragEditor — Canvas drag-and-drop operations
 *
 * Handles three drag scenarios in the editor canvas:
 * 1. Top-level reorder (drag between siblings)
 * 2. Drop a new component into a container
 * 3. Drag an existing component into a different container
 */
import type { Ref } from 'vue'
import type { PartialWidget } from '@/components/WidgetRenderer/types'
import { getItemAtPath, removeAtPath, insertAtPath } from '@/utils/schemaTransform'

export interface UseDragEditorOptions {
  schema: Ref<PartialWidget[]>
  selectedPath: Ref<number[] | null>
  selectedPaths: Ref<number[][]>
  pushState: (schema: PartialWidget[]) => void
}

export interface UseDragEditorReturn {
  handleDragReorder: (fromIndex: number, toIndex: number) => void
  handleDropToContainer: (parentPath: number[], index: number, item: PartialWidget) => void
  handleDragToContainer: (sourcePath: number[], targetPath: number[], targetIndex: number) => void
}

export function useDragEditor(options: UseDragEditorOptions): UseDragEditorReturn {
  const { schema, selectedPath, selectedPaths, pushState } = options

  /** Reorder two top-level items by index */
  function handleDragReorder(fromIndex: number, toIndex: number) {
    pushState(schema.value)
    const arr = [...schema.value]
    const [moved] = arr.splice(fromIndex, 1)
    arr.splice(toIndex, 0, moved)
    schema.value = arr
    selectedPath.value = [toIndex]
    selectedPaths.value = [selectedPath.value]
  }

  /** Drop a new component item into a container at the given path/index */
  function handleDropToContainer(parentPath: number[], index: number, item: PartialWidget) {
    pushState(schema.value)
    schema.value = insertAtPath(schema.value, parentPath, index, item)
    selectedPath.value = [...parentPath, index]
    selectedPaths.value = [selectedPath.value]
  }

  /** Drag an existing component from sourcePath into a different container */
  function handleDragToContainer(sourcePath: number[], targetPath: number[], targetIndex: number) {
    const targetStr = targetPath.join(',')
    const sourceStr = sourcePath.join(',')
    // Prevent dropping a container into its own descendant
    if (targetStr.startsWith(sourceStr + ',') || targetStr === sourceStr) return

    const item = getItemAtPath(schema.value, sourcePath)
    if (!item) return

    pushState(schema.value)
    const clonedItem = JSON.parse(JSON.stringify(item)) as PartialWidget
    let newSchema = removeAtPath(schema.value, sourcePath)
    const adjustedTargetPath = adjustTarget(sourcePath, targetPath)
    schema.value = insertAtPath(newSchema, adjustedTargetPath, targetIndex, clonedItem)
    selectedPath.value = [...adjustedTargetPath, targetIndex]
    selectedPaths.value = [selectedPath.value]
  }

  return { handleDragReorder, handleDropToContainer, handleDragToContainer }
}

/**
 * Adjust target path when dragging within the same parent at the same level.
 * If the source is before the target in the same parent, decrement the target
 * index to account for the source removal shifting indices.
 */
function adjustTarget(sourcePath: number[], targetPath: number[]): number[] {
  const minLen = Math.min(sourcePath.length, targetPath.length)
  for (let level = 0; level < minLen; level++) {
    if (sourcePath[level] !== targetPath[level]) {
      if (
        level === sourcePath.length - 1 &&
        level === targetPath.length - 1 &&
        sourcePath[level] < targetPath[level]
      ) {
        const adjusted = [...targetPath]
        adjusted[level]--
        return adjusted
      }
      return targetPath
    }
  }
  return targetPath
}
