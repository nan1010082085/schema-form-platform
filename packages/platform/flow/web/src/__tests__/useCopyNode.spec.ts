import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Node } from '@vue-flow/core'

function createNode(id: string, x = 100, y = 100, selected = false): Node {
  return {
    id,
    type: 'user-task',
    position: { x, y },
    data: { label: `Node ${id}`, assignee: 'user-1' },
    selected,
  }
}

describe('useCopyNode', () => {
  beforeEach(() => {
    vi.resetModules()
    setActivePinia(createPinia())
  })

  describe('programmatic API', () => {
    it('copySelected stores nodes in clipboard', async () => {
      const { useCopyNode } = await import('../composables/useCopyNode.js')
      const api = useCopyNode({
        getSelectedNodes: () => [createNode('n1', 100, 100, true)],
      })

      expect(api.hasClipboardContent()).toBe(false)
      api.copySelected()
      expect(api.hasClipboardContent()).toBe(true)
    })

    it('copySelected does nothing with empty selection', async () => {
      const { useCopyNode } = await import('../composables/useCopyNode.js')
      const api = useCopyNode({
        getSelectedNodes: () => [],
      })

      api.copySelected()
      expect(api.hasClipboardContent()).toBe(false)
    })

    it('pasteNodes adds nodes to graph store', async () => {
      const { useCopyNode } = await import('../composables/useCopyNode.js')
      const { useFlowGraphStore } = await import('../stores/flowGraph.js')
      const graphStore = useFlowGraphStore()

      const api = useCopyNode({
        getSelectedNodes: () => [createNode('n1', 100, 100, true)],
      })

      api.copySelected()
      const result = api.pasteNodes()

      expect(result).toHaveLength(1)
      expect(graphStore.nodes.length).toBe(1)
      expect(graphStore.nodes[0].id).not.toBe('n1')
      expect(graphStore.nodes[0].type).toBe('user-task')
    })

    it('pasteNodes preserves node data', async () => {
      const { useCopyNode } = await import('../composables/useCopyNode.js')
      const { useFlowGraphStore } = await import('../stores/flowGraph.js')
      const graphStore = useFlowGraphStore()

      const api = useCopyNode({
        getSelectedNodes: () => [createNode('n1', 100, 100, true)],
      })

      api.copySelected()
      api.pasteNodes()

      const data = graphStore.nodes[0].data as Record<string, unknown>
      expect(data.assignee).toBe('user-1')
      expect(data.label).toBe('Node n1')
    })

    it('pasteNodes offsets position by 20px', async () => {
      const { useCopyNode } = await import('../composables/useCopyNode.js')
      const { useFlowGraphStore } = await import('../stores/flowGraph.js')
      const graphStore = useFlowGraphStore()

      const api = useCopyNode({
        getSelectedNodes: () => [createNode('n1', 300, 400, true)],
      })

      api.copySelected()
      api.pasteNodes()

      expect(graphStore.nodes[0].position).toEqual({ x: 320, y: 420 })
    })

    it('multiple pastes increase offset', async () => {
      const { useCopyNode } = await import('../composables/useCopyNode.js')
      const { useFlowGraphStore } = await import('../stores/flowGraph.js')
      const graphStore = useFlowGraphStore()

      const api = useCopyNode({
        getSelectedNodes: () => [createNode('n1', 100, 100, true)],
      })

      api.copySelected()
      api.pasteNodes()
      api.pasteNodes()

      expect(graphStore.nodes.length).toBe(2)
      expect(graphStore.nodes[0].position).toEqual({ x: 120, y: 120 })
      expect(graphStore.nodes[1].position).toEqual({ x: 140, y: 140 })
    })

    it('pasteNodes returns empty array when clipboard is empty', async () => {
      const { useCopyNode } = await import('../composables/useCopyNode.js')
      const api = useCopyNode({
        getSelectedNodes: () => [],
      })

      const result = api.pasteNodes()
      expect(result).toBeUndefined()
    })

    it('multi-select copy preserves all nodes', async () => {
      const { useCopyNode } = await import('../composables/useCopyNode.js')
      const { useFlowGraphStore } = await import('../stores/flowGraph.js')
      const graphStore = useFlowGraphStore()

      const api = useCopyNode({
        getSelectedNodes: () => [
          createNode('n1', 100, 100, true),
          createNode('n2', 200, 200, true),
          createNode('n3', 300, 300, true),
        ],
      })

      api.copySelected()
      api.pasteNodes()

      expect(graphStore.nodes.length).toBe(3)
      const ids = graphStore.nodes.map((n: Node) => n.id)
      expect(new Set(ids).size).toBe(3)
      expect(ids).not.toContain('n1')
      expect(ids).not.toContain('n2')
      expect(ids).not.toContain('n3')
    })

    it('copy deep-clones so mutations do not affect clipboard', async () => {
      const { useCopyNode } = await import('../composables/useCopyNode.js')
      const { useFlowGraphStore } = await import('../stores/flowGraph.js')
      const graphStore = useFlowGraphStore()

      const original = createNode('n1', 100, 100, true)
      const api = useCopyNode({
        getSelectedNodes: () => [original],
      })

      api.copySelected()

      // Mutate original
      original.data.label = 'mutated'
      original.position.x = 999

      api.pasteNodes()

      expect(graphStore.nodes[0].data.label).toBe('Node n1')
      expect(graphStore.nodes[0].position.x).toBe(120) // 100 + 20
    })
  })

  describe('keyboard integration (via mounted component)', () => {
    /** Mount a wrapper component that calls useCopyNode in setup() */
    async function setup(getSelectedNodes: () => Node[], enabled?: () => boolean) {
      const { useCopyNode } = await import('../composables/useCopyNode.js')
      const { useFlowGraphStore } = await import('../stores/flowGraph.js')

      let api: ReturnType<typeof useCopyNode>
      let graphStore: ReturnType<typeof useFlowGraphStore>

      const Wrapper = defineComponent({
        setup() {
          api = useCopyNode({ getSelectedNodes, enabled })
          graphStore = useFlowGraphStore()
          return () => h('div')
        },
      })

      const wrapper = mount(Wrapper, {
        global: { plugins: [createPinia()] },
      })

      return { api: api!, graphStore: graphStore!, wrapper }
    }

    it('Ctrl+C copies selected nodes', async () => {
      const { api, wrapper } = await setup(
        () => [createNode('n1', 100, 100, true)],
      )

      expect(api.hasClipboardContent()).toBe(false)

      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }),
      )

      expect(api.hasClipboardContent()).toBe(true)
      wrapper.unmount()
    })

    it('Ctrl+V pastes nodes into graph store', async () => {
      const { api, graphStore, wrapper } = await setup(
        () => [createNode('n1', 100, 100, true)],
      )

      // Copy first
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }),
      )

      // Paste
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }),
      )

      expect(graphStore.nodes.length).toBe(1)
      expect(graphStore.nodes[0].id).not.toBe('n1')
      wrapper.unmount()
    })

    it('Ctrl+D duplicates in one action', async () => {
      const { graphStore, wrapper } = await setup(
        () => [
          createNode('n1', 100, 100, true),
          createNode('n2', 200, 200, true),
        ],
      )

      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }),
      )

      expect(graphStore.nodes.length).toBe(2)
      expect(graphStore.nodes[0].id).not.toBe('n1')
      expect(graphStore.nodes[1].id).not.toBe('n2')
      wrapper.unmount()
    })

    it('Ctrl+C ignored when enabled returns false', async () => {
      const { api, wrapper } = await setup(
        () => [createNode('n1', 100, 100, true)],
        () => false,
      )

      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }),
      )

      expect(api.hasClipboardContent()).toBe(false)
      wrapper.unmount()
    })

    it('Ctrl+C ignored inside input element', async () => {
      const { api, wrapper } = await setup(
        () => [createNode('n1', 100, 100, true)],
      )

      const input = document.createElement('input')
      document.body.appendChild(input)
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }),
      )
      document.body.removeChild(input)

      expect(api.hasClipboardContent()).toBe(false)
      wrapper.unmount()
    })

    it('Meta+C works the same as Ctrl+C', async () => {
      const { api, wrapper } = await setup(
        () => [createNode('n1', 100, 100, true)],
      )

      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'c', metaKey: true }),
      )

      expect(api.hasClipboardContent()).toBe(true)
      wrapper.unmount()
    })

    it('cleanup removes event listeners on unmount', async () => {
      const { api, wrapper } = await setup(
        () => [createNode('n1', 100, 100, true)],
      )

      wrapper.unmount()

      // After unmount, keyboard events should not trigger copy
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }),
      )

      expect(api.hasClipboardContent()).toBe(false)
    })
  })
})
