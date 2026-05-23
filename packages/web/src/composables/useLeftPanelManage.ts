/**
 * useLeftPanelManage — Structure tree interactions
 *
 * Handles tree node selection, drag-reorder within the structure tree,
 * and toggling item visibility. All operations push history state before mutation.
 */
import { nextTick } from 'vue'
import type { Ref } from 'vue'
import type { PartialWidget } from '@/components/WidgetRenderer/types'
import { getItemAtPath, removeAtPath, insertAtPath } from '@/utils/schemaTransform'

export interface UseLeftPanelManageOptions {
  schema: Ref<PartialWidget[]>
  selectedPath: Ref<number[] | null>
  selectedPaths: Ref<number[][]>
  drawerVisible: Ref<boolean>
  pushState: (schema: PartialWidget[]) => void
  replaceAtPath: (items: PartialWidget[], path: number[], newItem: PartialWidget) => PartialWidget[]
}

export interface UseLeftPanelManageReturn {
  handleTreeSelect: (path: number[]) => void
  handleTreeReorder: (payload: { sourcePath: number[]; targetPath: number[]; position: 'before' | 'after' | 'inside' }) => void
  handleToggleHidden: (path: number[], hidden: boolean) => void
}

export function useLeftPanelManage(options: UseLeftPanelManageOptions): UseLeftPanelManageReturn {
  const { schema, selectedPath, selectedPaths, drawerVisible, pushState, replaceAtPath } = options

  function handleTreeSelect(path: number[]) {
    selectedPath.value = path
    selectedPaths.value = [path]
    nextTick(() => { drawerVisible.value = true })
  }

  /**
   * Reorder an item within the structure tree via drag-and-drop.
   * Supports inserting before, after, or inside a target node.
   */
  function handleTreeReorder(payload: {
    sourcePath: number[]
    targetPath: number[]
    position: 'before' | 'after' | 'inside'
  }) {
    pushState(schema.value)
    const { sourcePath, targetPath, position } = payload

    const item = getItemAtPath(schema.value, sourcePath)
    if (!item) return

    // Calculate insert parent path and index based on position
    let insertParentPath: number[]
    let insertIndex: number
    if (position === 'inside') {
      insertParentPath = targetPath
      insertIndex = 0
    } else if (position === 'before') {
      insertParentPath = targetPath.slice(0, -1)
      insertIndex = targetPath[targetPath.length - 1]
    } else {
      insertParentPath = targetPath.slice(0, -1)
      insertIndex = targetPath[targetPath.length - 1] + 1
    }

    // Adjust index when moving within the same parent downward
    const sourceParent = sourcePath.slice(0, -1)
    const sourceIdx = sourcePath[sourcePath.length - 1]
    if (sourceParent.join(',') === insertParentPath.join(',') && sourceIdx < insertIndex) {
      insertIndex--
    }

    schema.value = removeAtPath(schema.value, sourcePath)
    schema.value = insertAtPath(
      schema.value,
      insertParentPath,
      insertIndex,
      JSON.parse(JSON.stringify(item)),
    )
    selectedPath.value = [...insertParentPath, insertIndex]
    selectedPaths.value = [selectedPath.value]
  }

  function handleToggleHidden(path: number[], hidden: boolean) {
    pushState(schema.value)
    const item = getItemAtPath(schema.value, path)
    if (!item) return
    schema.value = replaceAtPath(schema.value, path, { ...item, hidden })
  }

  return { handleTreeSelect, handleTreeReorder, handleToggleHidden }
}
