/**
 * useRightPanelConfig — Property panel drawer and item selection
 *
 * Manages the property drawer visibility, multi-select logic (click/ctrl/shift),
 * property updates with deep path replacement, and the shared replaceAtPath helper.
 */
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { PartialWidget } from '@/components/WidgetRenderer/types'
import { flattenToPaths, getItemAtPath } from '@/utils/schemaTransform'

export interface UseRightPanelConfigOptions {
  schema: Ref<PartialWidget[]>
  selectedPath: Ref<number[] | null>
  selectedPaths: Ref<number[][]>
  pushState: (schema: PartialWidget[]) => void
}

export interface UseRightPanelConfigReturn {
  drawerVisible: Ref<boolean>
  selectedSchema: Ref<PartialWidget | null>
  handleSelect: (index: number | null, ctrl?: boolean, shift?: boolean) => void
  handleOpenProperties: () => void
  handlePropertyUpdate: (updatedItem: PartialWidget) => void
  replaceAtPath: (items: PartialWidget[], path: number[], newItem: PartialWidget) => PartialWidget[]
}

/**
 * Deep-clone replace an item at the given path in the schema tree.
 * Returns a new array; does not mutate the input.
 */
function replaceAtPath(
  items: PartialWidget[],
  path: number[],
  newItem: PartialWidget,
): PartialWidget[] {
  if (path.length === 0) return items
  const result = JSON.parse(JSON.stringify(items)) as PartialWidget[]
  if (path.length === 1) {
    result[path[0]] = newItem
    return result
  }
  const parent = getItemAtPath(result, path.slice(0, -1))
  if (parent?.children) {
    parent.children[path[path.length - 1]] = newItem
  }
  return result
}

export function useRightPanelConfig(options: UseRightPanelConfigOptions): UseRightPanelConfigReturn {
  const { schema, selectedPath, selectedPaths, pushState } = options

  const drawerVisible = ref(false)

  const selectedSchema = computed<PartialWidget | null>(() => {
    if (!selectedPath.value) return null
    return getItemAtPath(schema.value, selectedPath.value) ?? null
  })

  /**
   * Handle canvas item selection with support for:
   * - Plain click: single select
   * - Ctrl+click: toggle individual item in multi-select
   * - Shift+click: range select (top-level only)
   */
  function handleSelect(index: number | null, ctrl?: boolean, shift?: boolean) {
    if (index === null) {
      selectedPath.value = null
      selectedPaths.value = []
      drawerVisible.value = false
      return
    }

    const clickedPath = [index]
    if (shift && selectedPath.value && selectedPath.value.length === 1) {
      // Range select: select all top-level items between anchor and clicked
      const fromIdx = selectedPath.value[0]
      const toIdx = index
      const minIdx = Math.min(fromIdx, toIdx)
      const maxIdx = Math.max(fromIdx, toIdx)
      const allPaths = flattenToPaths(schema.value)
      const topLevelPaths = allPaths.filter((p) => p.length === 1)
      const rangePaths = topLevelPaths.filter((p) => p[0] >= minIdx && p[0] <= maxIdx)
      selectedPaths.value = rangePaths
      selectedPath.value = clickedPath
    } else if (ctrl) {
      // Toggle item in multi-select set
      const key = clickedPath.join(',')
      const existingIdx = selectedPaths.value.findIndex((p) => p.join(',') === key)
      if (existingIdx >= 0) {
        selectedPaths.value = selectedPaths.value.filter((_, i) => i !== existingIdx)
        if (selectedPath.value?.join(',') === key) {
          selectedPath.value = selectedPaths.value.length > 0
            ? selectedPaths.value[selectedPaths.value.length - 1]
            : null
        }
      } else {
        selectedPaths.value = [...selectedPaths.value, clickedPath]
        selectedPath.value = clickedPath
      }
    } else {
      // Single select
      selectedPath.value = clickedPath
      selectedPaths.value = [clickedPath]
    }
  }

  function handleOpenProperties() {
    if (selectedPath.value) drawerVisible.value = true
  }

  function handlePropertyUpdate(updatedItem: PartialWidget) {
    if (!selectedPath.value) return
    pushState(schema.value)
    schema.value = replaceAtPath(schema.value, selectedPath.value, updatedItem)
  }

  return {
    drawerVisible,
    selectedSchema,
    handleSelect,
    handleOpenProperties,
    handlePropertyUpdate,
    replaceAtPath,
  }
}
