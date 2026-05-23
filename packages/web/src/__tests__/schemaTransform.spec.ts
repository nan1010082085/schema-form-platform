/**
 * schemaTransform unit tests
 *
 * Covers:
 * - getItemAtPath with valid and invalid paths
 * - removeAtPath at root level and nested level
 * - insertAtPath at root level and into container children
 * - groupAsContainer wraps selected items
 * - ungroupContainer extracts children
 * - moveItem reorders correctly
 * - buildSchemaTree generates correct tree structure for flat and nested schema
 * - isContainerType identifies card/page/toolbar correctly
 */
import { describe, it, expect } from 'vitest'
import {
  getItemAtPath,
  removeAtPath,
  insertAtPath,
  groupAsContainer,
  ungroupContainer,
  moveItem,
  buildSchemaTree,
  isContainerType,
  flattenToPaths,
  comparePaths,
} from '@/utils/schemaTransform'
import type { PartialWidget } from '@/widgets/base/types'

/** Helper: create a simple schema with a card container at index 1 */
function makeNestedSchema(): PartialWidget[] {
  return [
    { type: 'input', field: 'name', label: 'Name' },
    {
      type: 'card',
      label: 'Card',
      children: [
        { type: 'number', field: 'age', label: 'Age' },
        { type: 'input', field: 'email', label: 'Email' },
      ],
    },
    { type: 'textarea', field: 'desc', label: 'Description' },
  ]
}

describe('schemaTransform', () => {
  // ======== getItemAtPath ========

  describe('getItemAtPath', () => {
    it('returns item at root level path', () => {
      const schema: PartialWidget[] = [
        { type: 'input', field: 'a', label: 'A' },
        { type: 'input', field: 'b', label: 'B' },
      ]
      expect(getItemAtPath(schema, [0])?.field).toBe('a')
      expect(getItemAtPath(schema, [1])?.field).toBe('b')
    })

    it('returns item at nested path', () => {
      const schema = makeNestedSchema()
      const card = getItemAtPath(schema, [1])
      expect(card?.type).toBe('card')
      const nested = getItemAtPath(schema, [1, 0])
      expect(nested?.field).toBe('age')
    })

    it('returns undefined for empty path', () => {
      const schema = makeNestedSchema()
      expect(getItemAtPath(schema, [])).toBeUndefined()
    })

    it('returns undefined for out-of-range path', () => {
      const schema = makeNestedSchema()
      expect(getItemAtPath(schema, [99])).toBeUndefined()
    })

    it('returns undefined when intermediate path does not have children', () => {
      const schema = makeNestedSchema()
      // [0] is input, which has no children — [0, 0] should be undefined
      expect(getItemAtPath(schema, [0, 0])).toBeUndefined()
    })
  })

  // ======== removeAtPath ========

  describe('removeAtPath', () => {
    it('removes item at root level', () => {
      const schema: PartialWidget[] = [
        { type: 'input', field: 'a', label: 'A' },
        { type: 'input', field: 'b', label: 'B' },
      ]
      const result = removeAtPath(schema, [0])
      expect(result).toHaveLength(1)
      expect(result[0].field).toBe('b')
    })

    it('removes item at nested level', () => {
      const schema = makeNestedSchema()
      const result = removeAtPath(schema, [1, 0])
      const card = result[1] as PartialWidget
      expect(card.children).toHaveLength(1)
      expect(card.children![0].field).toBe('email')
    })

    it('returns original schema for empty path', () => {
      const schema: PartialWidget[] = [{ type: 'input', field: 'a', label: 'A' }]
      const result = removeAtPath(schema, [])
      expect(result).toHaveLength(1)
    })

    it('returns original schema when path is out of range', () => {
      const schema: PartialWidget[] = [{ type: 'input', field: 'a', label: 'A' }]
      const result = removeAtPath(schema, [99])
      expect(result).toHaveLength(1)
    })

    it('does not mutate original schema', () => {
      const schema = makeNestedSchema()
      const originalLength = schema.length
      removeAtPath(schema, [0])
      expect(schema).toHaveLength(originalLength)
    })
  })

  // ======== insertAtPath ========

  describe('insertAtPath', () => {
    it('inserts at root level', () => {
      const schema: PartialWidget[] = [
        { type: 'input', field: 'a', label: 'A' },
      ]
      const newItem: PartialWidget = { type: 'number', field: 'new', label: 'New' }
      const result = insertAtPath(schema, [], 1, newItem)
      expect(result).toHaveLength(2)
      expect(result[1].field).toBe('new')
    })

    it('inserts at beginning of root level', () => {
      const schema: PartialWidget[] = [
        { type: 'input', field: 'a', label: 'A' },
      ]
      const newItem: PartialWidget = { type: 'number', field: 'new', label: 'New' }
      const result = insertAtPath(schema, [], 0, newItem)
      expect(result).toHaveLength(2)
      expect(result[0].field).toBe('new')
    })

    it('inserts into container children', () => {
      const schema = makeNestedSchema()
      const newItem: PartialWidget = { type: 'radio', field: 'gender', label: 'Gender' }
      const result = insertAtPath(schema, [1], 1, newItem)
      const card = result[1] as PartialWidget
      expect(card.children).toHaveLength(3)
      expect(card.children![1].field).toBe('gender')
    })

    it('returns original schema when parentPath does not exist', () => {
      const schema: PartialWidget[] = [{ type: 'input', field: 'a', label: 'A' }]
      const newItem: PartialWidget = { type: 'input', field: 'x', label: 'X' }
      const result = insertAtPath(schema, [99], 0, newItem)
      expect(result).toHaveLength(1)
    })

    it('creates children array on parent if missing', () => {
      // Create an item without children
      const schema: PartialWidget[] = [
        { type: 'card', label: 'Empty' },
      ]
      const newItem: PartialWidget = { type: 'input', field: 'x', label: 'X' }
      const result = insertAtPath(schema, [0], 0, newItem)
      const card = result[0] as PartialWidget
      expect(card.children).toBeDefined()
      expect(card.children).toHaveLength(1)
      expect(card.children![0].field).toBe('x')
    })
  })

  // ======== groupAsContainer ========

  describe('groupAsContainer', () => {
    const schema: PartialWidget[] = [
      { type: 'input', field: 'a', label: 'A' },
      { type: 'input', field: 'b', label: 'B' },
      { type: 'input', field: 'c', label: 'C' },
      { type: 'input', field: 'd', label: 'D' },
    ]

    it('wraps selected items in a card container', () => {
      const result = groupAsContainer(schema, [1, 2], 'card')
      expect(result).toHaveLength(3) // a, card(containing b,c), d
      const card = result[1]
      expect(card.type).toBe('card')
      expect(card.children).toHaveLength(2)
      expect(card.children![0].field).toBe('b')
      expect(card.children![1].field).toBe('c')
    })

    it('wraps selected items in a page container', () => {
      const result = groupAsContainer(schema, [0, 1], 'page')
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('page')
      expect(result[0].children).toHaveLength(2)
    })

    it('returns original schema for empty selection', () => {
      const result = groupAsContainer(schema, [], 'card')
      expect(result).toEqual(schema)
    })

    it('returns original schema for non-container type', () => {
      const result = groupAsContainer(schema, [1, 2], 'input' as never)
      expect(result).toEqual(schema)
    })

    it('handles non-contiguous selection (sorts and selects only specified indices)', () => {
      const result = groupAsContainer(schema, [3, 0], 'card')
      // Only the explicitly selected items (indices 0 and 3) are grouped
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('card')
      // Container replaces items 0-3 (4 removed, 1 inserted), but only
      // contains the explicitly selected items (indices 0 and 3)
      expect(result[0].children).toHaveLength(2)
      expect(result[0].children![0].field).toBe('a')
      expect(result[0].children![1].field).toBe('d')
    })
  })

  // ======== ungroupContainer ========

  describe('ungroupContainer', () => {
    it('extracts children from a container', () => {
      const schema: PartialWidget[] = [
        { type: 'input', field: 'before', label: 'Before' },
        {
          type: 'card',
          label: 'Card',
          children: [
            { type: 'input', field: 'inner1', label: 'Inner 1' },
            { type: 'input', field: 'inner2', label: 'Inner 2' },
          ],
        },
        { type: 'input', field: 'after', label: 'After' },
      ]
      const result = ungroupContainer(schema, 1)
      expect(result).toHaveLength(4)
      expect(result[0].field).toBe('before')
      expect(result[1].field).toBe('inner1')
      expect(result[2].field).toBe('inner2')
      expect(result[3].field).toBe('after')
    })

    it('returns original schema for invalid index', () => {
      const schema: PartialWidget[] = [{ type: 'input', field: 'a', label: 'A' }]
      const result = ungroupContainer(schema, -1)
      expect(result).toEqual(schema)
    })

    it('returns original schema for non-container item', () => {
      const schema: PartialWidget[] = [{ type: 'input', field: 'a', label: 'A' }]
      const result = ungroupContainer(schema, 0)
      expect(result).toEqual(schema)
    })

    it('returns original schema for container with no children', () => {
      const schema: PartialWidget[] = [
        { type: 'card', label: 'Empty', children: [] },
      ]
      const result = ungroupContainer(schema, 0)
      expect(result).toEqual(schema)
    })
  })

  // ======== moveItem ========

  describe('moveItem', () => {
    it('moves item from one position to another', () => {
      const schema: PartialWidget[] = [
        { type: 'input', field: 'a', label: 'A' },
        { type: 'input', field: 'b', label: 'B' },
        { type: 'input', field: 'c', label: 'C' },
      ]
      const result = moveItem(schema, 0, 2)
      expect(result[0].field).toBe('b')
      expect(result[1].field).toBe('c')
      expect(result[2].field).toBe('a')
    })

    it('moves item to earlier position', () => {
      const schema: PartialWidget[] = [
        { type: 'input', field: 'a', label: 'A' },
        { type: 'input', field: 'b', label: 'B' },
        { type: 'input', field: 'c', label: 'C' },
      ]
      const result = moveItem(schema, 2, 0)
      expect(result[0].field).toBe('c')
      expect(result[1].field).toBe('a')
      expect(result[2].field).toBe('b')
    })

    it('returns original schema when fromIndex and toIndex are same', () => {
      const schema: PartialWidget[] = [
        { type: 'input', field: 'a', label: 'A' },
        { type: 'input', field: 'b', label: 'B' },
      ]
      const result = moveItem(schema, 0, 0)
      expect(result).toEqual(schema)
    })

    it('returns original schema when fromIndex is out of range', () => {
      const schema: PartialWidget[] = [{ type: 'input', field: 'a', label: 'A' }]
      const result = moveItem(schema, -1, 0)
      expect(result).toEqual(schema)
    })

    it('returns original schema when toIndex is out of range', () => {
      const schema: PartialWidget[] = [{ type: 'input', field: 'a', label: 'A' }]
      const result = moveItem(schema, 0, 99)
      expect(result).toEqual(schema)
    })
  })

  // ======== buildSchemaTree ========

  describe('buildSchemaTree', () => {
    it('generates correct tree for flat schema', () => {
      const schema: PartialWidget[] = [
        { type: 'input', field: 'name', label: 'Name' },
        { type: 'number', field: 'age', label: 'Age' },
      ]
      const tree = buildSchemaTree(schema)
      expect(tree).toHaveLength(2)
      expect(tree[0].id).toBe('0')
      expect(tree[0].path).toEqual([0])
      expect(tree[0].label).toBe('Name')
      expect(tree[0].isContainer).toBe(false)
      expect(tree[0].children).toHaveLength(0)
      expect(tree[1].id).toBe('1')
    })

    it('generates correct tree for nested schema', () => {
      const schema = makeNestedSchema()
      const tree = buildSchemaTree(schema)
      expect(tree).toHaveLength(3)

      // Card at index 1 should be a container
      const cardNode = tree[1]
      expect(cardNode.type).toBe('card')
      expect(cardNode.isContainer).toBe(true)
      expect(cardNode.children).toHaveLength(2)
      expect(cardNode.children[0].id).toBe('1-0')
      expect(cardNode.children[0].path).toEqual([1, 0])
    })

    it('identifies grid-row with children as container', () => {
      const schema: PartialWidget[] = [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 12, children: [] },
          ],
        },
      ]
      const tree = buildSchemaTree(schema)
      expect(tree[0].isContainer).toBe(true)
    })

    it('uses field as fallback label when label is missing', () => {
      const schema: PartialWidget[] = [
        { type: 'input', field: 'customField' },
      ]
      const tree = buildSchemaTree(schema)
      expect(tree[0].label).toBe('customField')
    })

    it('uses type as fallback label when both label and field are missing', () => {
      const schema: PartialWidget[] = [
        { type: 'divider' },
      ]
      const tree = buildSchemaTree(schema)
      expect(tree[0].label).toBe('divider')
    })
  })

  // ======== isContainerType ========

  describe('isContainerType', () => {
    it('identifies card as container when it has children array', () => {
      const item: PartialWidget = {
        type: 'card',
        children: [{ type: 'input', field: 'x', label: 'X' }],
      }
      expect(isContainerType(item)).toBe(true)
    })

    it('does not identify card without children as container', () => {
      const item: PartialWidget = { type: 'card' }
      expect(isContainerType(item)).toBe(false)
    })

    it('identifies page as container', () => {
      const item: PartialWidget = {
        type: 'page',
        children: [],
      }
      expect(isContainerType(item)).toBe(true)
    })

    it('identifies toolbar as container', () => {
      const item: PartialWidget = {
        type: 'toolbar',
        children: [],
      }
      expect(isContainerType(item)).toBe(true)
    })

    it('does not identify input as container', () => {
      const item: PartialWidget = { type: 'input', field: 'x' }
      expect(isContainerType(item)).toBe(false)
    })
  })

  // ======== flattenToPaths ========

  describe('flattenToPaths', () => {
    it('flattens flat schema', () => {
      const schema: PartialWidget[] = [
        { type: 'input', field: 'a', label: 'A' },
        { type: 'input', field: 'b', label: 'B' },
      ]
      const paths = flattenToPaths(schema)
      expect(paths).toEqual([[0], [1]])
    })

    it('flattens nested schema depth-first', () => {
      const schema = makeNestedSchema()
      const paths = flattenToPaths(schema)
      // Expected: [0], [1], [1,0], [1,1], [2]
      expect(paths).toHaveLength(5)
      expect(paths[0]).toEqual([0])
      expect(paths[1]).toEqual([1])
      expect(paths[2]).toEqual([1, 0])
      expect(paths[3]).toEqual([1, 1])
      expect(paths[4]).toEqual([2])
    })

    it('returns empty array for empty schema', () => {
      expect(flattenToPaths([])).toEqual([])
    })
  })

  // ======== comparePaths ========

  describe('comparePaths', () => {
    it('returns negative when a < b', () => {
      expect(comparePaths([0], [1])).toBeLessThan(0)
    })

    it('returns positive when a > b', () => {
      expect(comparePaths([2], [1])).toBeGreaterThan(0)
    })

    it('returns 0 for equal paths', () => {
      expect(comparePaths([0, 1], [0, 1])).toBe(0)
    })

    it('compares deeper paths correctly', () => {
      expect(comparePaths([0, 0], [0, 1])).toBeLessThan(0)
      expect(comparePaths([0, 1, 0], [0, 1])).toBeGreaterThan(0)
    })

    it('compares prefix paths correctly', () => {
      expect(comparePaths([0], [0, 0])).toBeLessThan(0)
    })
  })
})
