import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@vue-flow/core'
import { DEFAULT_NODE_SIZES } from '@schema-form/flow-shared'
import { BpmnElementType } from '@schema-form/flow-shared'

export type LayoutDirection = 'LR' | 'TB'

const VF_TYPE_TO_BPMN: Record<string, BpmnElementType> = {
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

function getNodeSize(type: string | undefined): { width: number; height: number } {
  if (!type) return { width: 160, height: 80 }
  const bpmnType = VF_TYPE_TO_BPMN[type]
  if (bpmnType) return DEFAULT_NODE_SIZES[bpmnType]
  return { width: 160, height: 80 }
}

/**
 * Apply dagre auto-layout to the given nodes and edges.
 * Returns new position arrays without mutating the originals.
 */
export function applyAutoLayout(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = 'LR',
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges }

  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 80,
    edgesep: 30,
    marginx: 20,
    marginy: 20,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    const size = getNodeSize(node.type)
    g.setNode(node.id, { width: size.width, height: size.height })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const layoutNodes = nodes.map((node) => {
    const dagreNode = g.node(node.id) as { x: number; y: number; width: number; height: number } | undefined
    if (!dagreNode) return node
    const size = getNodeSize(node.type)
    return {
      ...node,
      position: {
        x: dagreNode.x - size.width / 2,
        y: dagreNode.y - size.height / 2,
      },
    }
  })

  return { nodes: layoutNodes, edges }
}
