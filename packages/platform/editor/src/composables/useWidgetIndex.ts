/**
 * useWidgetIndex — O(1) Widget lookup by ID
 *
 * Builds a flat Map<id, Widget> from the widget tree.
 * Rebuilds only when the widgets array reference changes.
 *
 * Replaces O(n) recursive findWidget calls with O(1) map lookups.
 */
import { computed, type Ref } from 'vue'
import type { Widget } from '@/widgets/base/types'

export interface WidgetIndex {
  /** O(1) lookup by widget ID */
  get(id: string): Widget | undefined
  /** O(1) check existence */
  has(id: string): boolean
  /** Get the raw map (for iteration) */
  readonly map: Map<string, Widget>
}

/**
 * Build a flat index from a widget tree.
 * Walks the tree once and maps every widget by its ID.
 */
function buildIndex(widgets: Widget[]): Map<string, Widget> {
  const index = new Map<string, Widget>()
  function walk(items: Widget[]) {
    for (const item of items) {
      index.set(item.id, item)
      if (item.children?.length) {
        walk(item.children as Widget[])
      }
    }
  }
  walk(widgets)
  return index
}

/**
 * Composable that maintains a reactive widget index.
 *
 * @param widgets - reactive ref to the widget tree
 * @returns WidgetIndex with O(1) lookup methods
 */
export function useWidgetIndex(widgets: Ref<Widget[]>): WidgetIndex {
  const indexMap = computed(() => buildIndex(widgets.value))

  return {
    get(id: string): Widget | undefined {
      return indexMap.value.get(id)
    },
    has(id: string): boolean {
      return indexMap.value.has(id)
    },
    get map() {
      return indexMap.value
    },
  }
}
