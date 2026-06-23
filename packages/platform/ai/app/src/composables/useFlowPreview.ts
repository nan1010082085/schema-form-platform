/**
 * useFlowPreview — 将 FlowGraph 转换为 Vue Flow 格式
 */
import { computed, type Ref, type ComputedRef } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import type { FlowGraph } from '@/types'

export function useFlowPreview(graphRef: ComputedRef<FlowGraph | undefined> | Ref<FlowGraph | undefined>) {
  const nodes = computed<Node[]>(() => {
    const graph = graphRef.value
    if (!graph?.nodes) return []
    return graph.nodes.map((node) => ({
      id: node.id,
      type: 'default',
      position: node.position || { x: 0, y: 0 },
      data: {
        label: node.data?.label || node.id,
        ...node.data,
      },
      style: getNodeStyle(node.data?.bpmnType),
    }))
  })

  const edges = computed<Edge[]>(() => {
    const graph = graphRef.value
    if (!graph?.edges) return []
    return graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source.cell,
      target: edge.target.cell,
      label: edge.data?.conditionExpression,
      animated: false,
      style: { stroke: '#00d4ff' },
    }))
  })

  const nodeCount = computed(() => nodes.value.length)
  const edgeCount = computed(() => edges.value.length)

  return { nodes, edges, nodeCount, edgeCount }
}

function getNodeStyle(bpmnType?: string) {
  const base = {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    border: '1px solid',
  }

  switch (bpmnType) {
    case 'startEvent':
      return { ...base, background: '#e6f7e6', borderColor: '#52c41a' }
    case 'endEvent':
      return { ...base, background: '#fff1f0', borderColor: '#ff4d4f' }
    case 'userTask':
      return { ...base, background: '#e6f7ff', borderColor: '#1890ff' }
    case 'serviceTask':
      return { ...base, background: '#f0f5ff', borderColor: '#2f54eb' }
    case 'exclusiveGateway':
      return { ...base, background: '#fff7e6', borderColor: '#fa8c16' }
    default:
      return { ...base, background: '#fafafa', borderColor: '#d9d9d9' }
  }
}
