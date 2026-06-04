import { describe, it, expect, beforeEach } from 'vitest'
import type { Node } from '@vue-flow/core'

// Reset the module before each test to clear shared state
beforeEach(async () => {
  vi.resetModules()
})

function createNode(id: string, x = 100, y = 100): Node {
  return {
    id,
    type: 'user-task',
    position: { x, y },
    data: { label: `Node ${id}` },
  }
}

describe('useClipboard', () => {
  it('copy stores nodes', async () => {
    const { useClipboard } = await import('../composables/useClipboard.js')
    const { copy, hasClipboardContent } = useClipboard()

    expect(hasClipboardContent()).toBe(false)
    copy([createNode('n1')])
    expect(hasClipboardContent()).toBe(true)
  })

  it('paste returns empty array when nothing copied', async () => {
    const { useClipboard } = await import('../composables/useClipboard.js')
    const { paste } = useClipboard()

    expect(paste()).toEqual([])
  })

  it('paste returns nodes with new IDs', async () => {
    const { useClipboard } = await import('../composables/useClipboard.js')
    const { copy, paste } = useClipboard()

    copy([createNode('n1'), createNode('n2')])
    const pasted = paste()

    expect(pasted).toHaveLength(2)
    expect(pasted[0].id).not.toBe('n1')
    expect(pasted[1].id).not.toBe('n2')
    expect(pasted[0].id).not.toBe(pasted[1].id)
  })

  it('paste offsets position by 20px on first paste', async () => {
    const { useClipboard } = await import('../composables/useClipboard.js')
    const { copy, paste } = useClipboard()

    copy([createNode('n1', 100, 200)])
    const pasted = paste()

    expect(pasted[0].position).toEqual({ x: 120, y: 220 })
  })

  it('paste increases offset on each subsequent paste', async () => {
    const { useClipboard } = await import('../composables/useClipboard.js')
    const { copy, paste } = useClipboard()

    copy([createNode('n1', 100, 100)])

    const first = paste()
    expect(first[0].position).toEqual({ x: 120, y: 120 })

    const second = paste()
    expect(second[0].position).toEqual({ x: 140, y: 140 })

    const third = paste()
    expect(third[0].position).toEqual({ x: 160, y: 160 })
  })

  it('copy resets paste count so offset starts fresh', async () => {
    const { useClipboard } = await import('../composables/useClipboard.js')
    const { copy, paste } = useClipboard()

    copy([createNode('n1', 100, 100)])
    paste()
    paste()

    // Recopy — offset should reset
    copy([createNode('n2', 50, 50)])
    const fresh = paste()
    expect(fresh[0].position).toEqual({ x: 70, y: 70 })
  })

  it('paste preserves node type and data', async () => {
    const { useClipboard } = await import('../composables/useClipboard.js')
    const { copy, paste } = useClipboard()

    copy([createNode('n1')])
    const pasted = paste()

    expect(pasted[0].type).toBe('user-task')
    expect(pasted[0].data).toEqual({ label: 'Node n1' })
  })

  it('paste marks nodes as not selected', async () => {
    const { useClipboard } = await import('../composables/useClipboard.js')
    const { copy, paste } = useClipboard()

    const selectedNode = { ...createNode('n1'), selected: true }
    copy([selectedNode])
    const pasted = paste()

    expect(pasted[0].selected).toBe(false)
  })

  it('copy with empty array does nothing', async () => {
    const { useClipboard } = await import('../composables/useClipboard.js')
    const { copy, paste, hasClipboardContent } = useClipboard()

    copy([])
    expect(hasClipboardContent()).toBe(false)
    expect(paste()).toEqual([])
  })

  it('copy deep-clones so mutations do not affect clipboard', async () => {
    const { useClipboard } = await import('../composables/useClipboard.js')
    const { copy, paste } = useClipboard()

    const node = createNode('n1', 100, 100)
    copy([node])

    // Mutate original
    node.data.label = 'mutated'
    node.position.x = 999

    const pasted = paste()
    expect(pasted[0].data.label).toBe('Node n1')
    expect(pasted[0].position.x).toBe(120) // 100 + 20 offset
  })
})
