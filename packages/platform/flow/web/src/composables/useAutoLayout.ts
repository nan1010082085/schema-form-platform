import { ref, computed } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import { applyAutoLayout, type LayoutDirection } from '../utils/autoLayout.js'
import { useFlowGraphStore } from '../stores/flowGraph.js'

export type { LayoutDirection }

export function useAutoLayout() {
  const graphStore = useFlowGraphStore()

  const direction = ref<LayoutDirection>('TB')
  const nodeSep = ref(60)
  const rankSep = ref(80)

  const directionLabel = computed(() => (direction.value === 'TB' ? '垂直' : '水平'))

  /**
   * Compute the layout result without mutating the store.
   * Returns the updated nodes/edges for the caller to apply as needed.
   */
  function computeLayout(): { nodes: Node[]; edges: Edge[] } | null {
    const nodes = graphStore.nodes
    const edges = graphStore.edges
    if (nodes.length === 0) return null
    return applyAutoLayout(nodes, edges, { direction: direction.value, nodeSep: nodeSep.value, rankSep: rankSep.value })
  }

  /**
   * Apply layout directly to the store (convenience for callers that
   * don't need undo integration).
   */
  function applyLayout(): void {
    const result = computeLayout()
    if (result) graphStore.loadGraph(result)
  }

  function toggleDirection() {
    direction.value = direction.value === 'TB' ? 'LR' : 'TB'
  }

  return {
    direction,
    nodeSep,
    rankSep,
    directionLabel,
    computeLayout,
    applyLayout,
    toggleDirection,
  }
}
