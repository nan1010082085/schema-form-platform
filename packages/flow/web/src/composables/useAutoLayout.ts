import { ref, computed } from 'vue'
import dagre from '@dagrejs/dagre'
import { BpmnElementType, DEFAULT_NODE_SIZES } from '@schema-form/flow-shared'
import type { Node } from '@vue-flow/core'
import { useFlowGraphStore } from '../stores/flowGraph.js'

export type LayoutDirection = 'TB' | 'LR'

const VF_TO_BPMN: Record<string, BpmnElementType> = {
  'start-event': BpmnElementType.StartEvent,
  'end-event': BpmnElementType.EndEvent,
  'timer-event': BpmnElementType.TimerEvent,
  'user-task': BpmnElementType.UserTask,
  'service-task': BpmnElementType.ServiceTask,
  'script-task': BpmnElementType.ScriptTask,
  'send-task': BpmnElementType.SendTask,
  'receive-task': BpmnElementType.ReceiveTask,
  'exclusive-gateway': BpmnElementType.ExclusiveGateway,
  'parallel-gateway': BpmnElementType.ParallelGateway,
  'inclusive-gateway': BpmnElementType.InclusiveGateway,
  'sub-process': BpmnElementType.SubProcess,
}

function resolveNodeSize(node: Node): { width: number; height: number } {
  const bpmnType = VF_TO_BPMN[node.type ?? '']
  if (bpmnType) return DEFAULT_NODE_SIZES[bpmnType]
  return { width: 160, height: 80 }
}

export function useAutoLayout() {
  const graphStore = useFlowGraphStore()

  const direction = ref<LayoutDirection>('TB')
  const nodeSep = ref(60)
  const rankSep = ref(80)

  const directionLabel = computed(() => (direction.value === 'TB' ? '垂直' : '水平'))

  function applyLayout(): void {
    const nodes = graphStore.nodes
    const edges = graphStore.edges
    if (nodes.length === 0) return

    const g = new dagre.graphlib.Graph()
    g.setGraph({
      rankdir: direction.value,
      nodesep: nodeSep.value,
      ranksep: rankSep.value,
      marginx: 20,
      marginy: 20,
    })
    g.setDefaultEdgeLabel(() => ({}))

    for (const node of nodes) {
      const size = resolveNodeSize(node)
      g.setNode(node.id, { width: size.width, height: size.height })
    }

    for (const edge of edges) {
      g.setEdge(edge.source, edge.target)
    }

    dagre.layout(g)

    const updatedNodes = nodes.map((node) => {
      const pos = g.node(node.id)
      if (!pos) return node
      const size = resolveNodeSize(node)
      return {
        ...node,
        position: {
          x: pos.x - size.width / 2,
          y: pos.y - size.height / 2,
        },
      }
    })

    graphStore.loadGraph({ nodes: updatedNodes, edges })
  }

  function toggleDirection() {
    direction.value = direction.value === 'TB' ? 'LR' : 'TB'
  }

  return {
    direction,
    nodeSep,
    rankSep,
    directionLabel,
    applyLayout,
    toggleDirection,
  }
}
