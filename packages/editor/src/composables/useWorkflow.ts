/**
 * useWorkflow — 工作流状态管理
 *
 * 职责：
 * - 节点增删改查
 * - 边连接管理
 * - 变量引用
 * - 工作流持久化
 */
import { ref, computed } from 'vue'
import type { Node, Edge, Connection } from '@vue-flow/core'
import { useVueFlow } from '@vue-flow/core'

// ── 节点类型定义 ──

export type WorkflowNodeType = 'start' | 'end' | 'editor' | 'flow' | 'ai' | 'condition'

export interface WorkflowNodeData {
  label: string
  nodeType: WorkflowNodeType
  config: Record<string, unknown>
  description?: string
}

export interface WorkflowVariable {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  defaultValue?: unknown
  description?: string
}

export interface WorkflowState {
  id: string
  name: string
  description: string
  nodes: Node<WorkflowNodeData>[]
  edges: Edge[]
  variables: WorkflowVariable[]
  status: 'draft' | 'published' | 'archived'
}

// ── 默认节点配置 ──

const DEFAULT_NODE_CONFIGS: Record<WorkflowNodeType, Record<string, unknown>> = {
  start: {},
  end: {},
  editor: { schemaId: '', fields: [] },
  flow: { flowId: '', triggerType: 'manual' },
  ai: { prompt: '', model: 'gpt-4', temperature: 0.7 },
  condition: { field: '', operator: 'equals', value: '' },
}

const NODE_TYPE_LABELS: Record<WorkflowNodeType, string> = {
  start: '开始',
  end: '结束',
  editor: 'Editor 节点',
  flow: 'Flow 节点',
  ai: 'AI 节点',
  condition: '条件节点',
}

export function useWorkflow() {
  const { addNodes, removeNodes, addEdges, removeEdges, getNodes, getEdges, findNode } = useVueFlow()

  // ── 工作流状态 ──
  const workflow = ref<WorkflowState>({
    id: '',
    name: '未命名工作流',
    description: '',
    nodes: [],
    edges: [],
    variables: [],
    status: 'draft',
  })

  const selectedNodeId = ref<string | null>(null)
  const selectedEdgeId = ref<string | null>(null)

  // ── 选中节点数据 ──
  const selectedNode = computed(() => {
    if (!selectedNodeId.value) return null
    return findNode(selectedNodeId.value) ?? null
  })

  const selectedNodeData = computed(() => {
    return selectedNode.value?.data as WorkflowNodeData | undefined ?? null
  })

  // ── 节点操作 ──

  function addNode(type: WorkflowNodeType, position: { x: number; y: number }) {
    const id = `${type}_${Date.now()}`
    const node: Node<WorkflowNodeData> = {
      id,
      type: 'workflow-node',
      position,
      data: {
        label: NODE_TYPE_LABELS[type],
        nodeType: type,
        config: { ...DEFAULT_NODE_CONFIGS[type] },
      },
    }
    addNodes(node)
    return id
  }

  function deleteNode(id: string) {
    // 删除关联的边
    const relatedEdges = getEdges.value.filter(e => e.source === id || e.target === id)
    removeEdges(relatedEdges)
    removeNodes(id)
    if (selectedNodeId.value === id) {
      selectedNodeId.value = null
    }
  }

  function updateNodeData(id: string, data: Partial<WorkflowNodeData>) {
    const node = findNode(id)
    if (!node) return
    node.data = { ...node.data, ...data }
  }

  function updateNodeConfig(id: string, config: Record<string, unknown>) {
    const node = findNode(id)
    if (!node) return
    const nodeData = node.data as WorkflowNodeData
    nodeData.config = { ...nodeData.config, ...config }
  }

  // ── 边操作 ──

  function handleConnect(connection: Connection) {
    const edge: Edge = {
      id: `e_${connection.source}_${connection.target}`,
      source: connection.source as string,
      target: connection.target as string,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
      animated: true,
    }
    addEdges(edge)
  }

  function deleteEdge(id: string) {
    removeEdges(id)
    if (selectedEdgeId.value === id) {
      selectedEdgeId.value = null
    }
  }

  // ── 变量操作 ──

  function addVariable(variable: WorkflowVariable) {
    workflow.value.variables.push(variable)
  }

  function removeVariable(key: string) {
    const idx = workflow.value.variables.findIndex(v => v.key === key)
    if (idx >= 0) workflow.value.variables.splice(idx, 1)
  }

  function updateVariable(key: string, updates: Partial<WorkflowVariable>) {
    const variable = workflow.value.variables.find(v => v.key === key)
    if (variable) Object.assign(variable, updates)
  }

  // ── 选择 ──

  function selectNode(id: string | null) {
    selectedNodeId.value = id
    selectedEdgeId.value = null
  }

  function selectEdge(id: string | null) {
    selectedEdgeId.value = id
    selectedNodeId.value = null
  }

  // ── 序列化 ──

  function exportWorkflow() {
    const nodes = getNodes.value as Node<WorkflowNodeData>[]
    const edges = getEdges.value
    return {
      ...workflow.value,
      nodes,
      edges,
    }
  }

  function loadWorkflow(data: WorkflowState) {
    workflow.value = {
      id: data.id,
      name: data.name,
      description: data.description,
      nodes: data.nodes,
      edges: data.edges,
      variables: data.variables ?? [],
      status: data.status ?? 'draft',
    }
    addNodes(data.nodes)
    addEdges(data.edges)
  }

  return {
    workflow,
    selectedNodeId,
    selectedEdgeId,
    selectedNode,
    selectedNodeData,
    addNode,
    deleteNode,
    updateNodeData,
    updateNodeConfig,
    handleConnect,
    deleteEdge,
    addVariable,
    removeVariable,
    updateVariable,
    selectNode,
    selectEdge,
    exportWorkflow,
    loadWorkflow,
  }
}
