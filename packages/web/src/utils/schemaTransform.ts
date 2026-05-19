/**
 * schemaTransform — Schema tree manipulation utilities
 *
 * Provides group/ungroup, move, and path-based operations for the editor.
 */
import type { FormSchemaItem, SchemaType } from '@/components/FormGrid/types'
import { LAYOUT_CONTAINER_TYPES } from '@/composables/useConstant'

/** Container types that support children — 统一引用 useConstant */
const CONTAINER_TYPES = LAYOUT_CONTAINER_TYPES

// ----------------------------------------------------------------
// Path-based tree operations (Sprint 10)
// ----------------------------------------------------------------

/**
 * Get the item at a given path in the schema tree.
 * Path [0, 2, 1] means schema[0].children[2].children[1].
 */
export function getItemAtPath(schema: FormSchemaItem[], path: number[]): FormSchemaItem | undefined {
  if (path.length === 0) return undefined
  let current = schema[path[0]]
  for (let i = 1; i < path.length; i++) {
    if (!current?.children) return undefined
    current = current.children[path[i]]
  }
  return current
}

/**
 * Remove the item at the given path, returning a new schema array.
 */
export function removeAtPath(schema: FormSchemaItem[], path: number[]): FormSchemaItem[] {
  if (path.length === 0) return schema
  const result = JSON.parse(JSON.stringify(schema)) as FormSchemaItem[]
  if (path.length === 1) {
    result.splice(path[0], 1)
    return result
  }
  const parent = getItemAtPath(result, path.slice(0, -1))
  if (!parent?.children) return schema
  parent.children.splice(path[path.length - 1], 1)
  return result
}

/**
 * Insert an item into the children of the item at parentPath, at the given index.
 * If parentPath is empty, inserts into the top-level schema.
 */
export function insertAtPath(
  schema: FormSchemaItem[],
  parentPath: number[],
  index: number,
  item: FormSchemaItem,
): FormSchemaItem[] {
  const result = JSON.parse(JSON.stringify(schema)) as FormSchemaItem[]
  if (parentPath.length === 0) {
    result.splice(index, 0, item)
    return result
  }
  const parent = getItemAtPath(result, parentPath)
  if (!parent) return schema
  if (!parent.children) parent.children = []
  parent.children.splice(index, 0, item)
  return result
}

/**
 * Compare two paths lexicographically for sorting.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function comparePaths(a: number[], b: number[]): number {
  const minLen = Math.min(a.length, b.length)
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return a.length - b.length
}

/**
 * Flatten the schema tree into an ordered list of paths (depth-first).
 * Used for range-select with Shift+Click.
 */
export function flattenToPaths(schema: FormSchemaItem[]): number[][] {
  const result: number[][] = []
  function walk(items: FormSchemaItem[], prefix: number[]) {
    for (let i = 0; i < items.length; i++) {
      const path = [...prefix, i]
      result.push(path)
      if (items[i].children?.length) {
        walk(items[i].children!, path)
      }
    }
  }
  walk(schema, [])
  return result
}

// ----------------------------------------------------------------
// Schema tree node for SchemaTree panel (Sprint 10)
// ----------------------------------------------------------------

/** Flattened tree node for the SchemaTree component */
export interface SchemaTreeNode {
  id: string          // path key, e.g. "0-1-2"
  path: number[]      // index path, e.g. [0, 1, 2]
  type: SchemaType
  label: string
  field?: string
  isContainer: boolean
  children: SchemaTreeNode[]
}

/**
 * Build a tree data structure from schema for the SchemaTree panel.
 */
export function buildSchemaTree(schema: FormSchemaItem[]): SchemaTreeNode[] {
  function walk(items: FormSchemaItem[], parentPath: number[]): SchemaTreeNode[] {
    return items.map((item, index) => {
      const path = [...parentPath, index]
      const isContainer = CONTAINER_TYPES.has(item.type) || (Array.isArray(item.children) && item.children.length > 0 && ['grid-row', 'grid-col', 'steps', 'tabs'].includes(item.type))
      const label = item.label || item.field || item.type
      return {
        id: path.join('-'),
        path,
        type: item.type,
        label,
        field: item.field,
        isContainer,
        children: item.children ? walk(item.children, path) : [],
      }
    })
  }
  return walk(schema, [])
}

/**
 * Check if a schema item is a container type that can hold children.
 */
export function isContainerType(item: FormSchemaItem): boolean {
  return CONTAINER_TYPES.has(item.type) && Array.isArray(item.children)
}

/**
 * Get the default label for a container type.
 */
function getDefaultContainerLabel(type: SchemaType): string {
  switch (type) {
    case 'card': return 'Card'
    case 'page': return 'Page'
    case 'toolbar': return 'Toolbar'
    default: return type
  }
}

/**
 * Wrap selected items in a new container.
 *
 * @param items - Full schema array
 * @param selectedIndices - Indices of items to group (must be contiguous for clean results)
 * @param containerType - One of 'card', 'page', 'toolbar'
 * @returns New schema array with the selected items wrapped in a container
 */
export function groupAsContainer(
  items: FormSchemaItem[],
  selectedIndices: number[],
  containerType: SchemaType,
): FormSchemaItem[] {
  if (selectedIndices.length === 0) return items
  if (!CONTAINER_TYPES.has(containerType)) return items

  // Sort indices to maintain order
  const sorted = [...selectedIndices].sort((a, b) => a - b)
  const minIdx = sorted[0]
  const maxIdx = sorted[sorted.length - 1]

  // Extract the selected items (preserving order)
  const selectedItems = sorted.map((i) => items[i])

  // Deep clone the selected items for the container children
  const children = JSON.parse(JSON.stringify(selectedItems)) as FormSchemaItem[]

  // Build the new container
  const container: FormSchemaItem = {
    type: containerType,
    label: getDefaultContainerLabel(containerType),
    children,
  }

  // Replace the selected range with the container
  const result = [...items]
  result.splice(minIdx, maxIdx - minIdx + 1, container)

  return result
}

/**
 * Extract children from a container, replacing it with its children.
 *
 * @param items - Full schema array
 * @param containerIndex - Index of the container to ungroup
 * @returns New schema array with the container replaced by its children
 */
export function ungroupContainer(
  items: FormSchemaItem[],
  containerIndex: number,
): FormSchemaItem[] {
  if (containerIndex < 0 || containerIndex >= items.length) return items

  const item = items[containerIndex]
  if (!isContainerType(item)) return items

  const children = item.children ?? []
  if (children.length === 0) return items

  // Deep clone children to avoid reference issues
  const clonedChildren = JSON.parse(JSON.stringify(children)) as FormSchemaItem[]

  const result = [...items]
  result.splice(containerIndex, 1, ...clonedChildren)

  return result
}

/**
 * Move an item from one position to another within the schema array.
 *
 * @param items - Full schema array
 * @param fromIndex - Source index
 * @param toIndex - Target index (after removal of source)
 * @returns New schema array with the item moved
 */
export function moveItem(
  items: FormSchemaItem[],
  fromIndex: number,
  toIndex: number,
): FormSchemaItem[] {
  if (fromIndex === toIndex) return items
  if (fromIndex < 0 || fromIndex >= items.length) return items
  if (toIndex < 0 || toIndex >= items.length) return items

  const result = [...items]
  const [moved] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, moved)

  return result
}
