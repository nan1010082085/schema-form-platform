import { computed, type Ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import { MarkerType } from '@vue-flow/core'
import type { FlowGraph } from '@/types'

/** BPMN type -> Vue Flow preview node type */
const BPMN_TO_VF_TYPE: Record<string, string> = {
  startEvent: 'start-event',
  endEvent: 'end-event',
  userTask: 'task',
  serviceTask: 'task',
  scriptTask: 'task',
  sendTask: 'task',
  receiveTask: 'task',
  exclusiveGateway: 'gateway',
  parallelGateway: 'gateway',
  inclusiveGateway: 'gateway',
}

function resolveNodeType(bpmnType: string): string {
  return BPMN_TO_VF_TYPE[bpmnType] ?? 'task'
}

/**
 * Transform FlowGraph from AI backend to Vue Flow format
 */
export function useFlowPreview(flowGraph: Ref<FlowGraph | undefined>) {
  const nodes = computed<Node[]>(() => {
    const graph = flowGraph.value
    if (!graph?.nodes) return []

    return graph.nodes.map((n) => ({
      id: n.id,
      type: resolveNodeType(n.data.bpmnType),
      position: n.position ?? { x: 0, y: 0 },
      data: {
        label: n.data.label ?? n.id,
        bpmnType: n.data.bpmnType,
      },
      draggable: true,
    }))
  })

  const edges = computed<Edge[]>(() => {
    const graph = flowGraph.value
    if (!graph?.edges) return []

    return graph.edges.map((e) => ({
      id: e.id,
      source: e.source.cell,
      target: e.target.cell,
      label: e.data?.label as string | undefined,
      type: 'smoothstep' as const,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: 'var(--ai-color-info, #4581e9)', strokeWidth: 1.5 },
    }))
  })

  const nodeCount = computed(() => nodes.value.length)
  const edgeCount = computed(() => edges.value.length)

  return {
    nodes,
    edges,
    nodeCount,
    edgeCount,
  }
}
