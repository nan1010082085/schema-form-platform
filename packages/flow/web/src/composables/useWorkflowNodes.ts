import { computed } from 'vue'
import type { Component } from 'vue'
import {
  StartNode,
  EndNode,
  EditorNode,
  FlowNode,
  AINode,
  ConditionNode,
} from '../components/workflowNodes/index.js'

/** Workflow 节点类型标识 */
export type WorkflowNodeType =
  | 'workflowStart'
  | 'workflowEnd'
  | 'workflowEditor'
  | 'workflowFlow'
  | 'workflowAI'
  | 'workflowCondition'

/** Workflow 节点默认数据 */
export interface WorkflowNodeDefaults {
  label?: string
  name?: string
  [key: string]: unknown
}

/** 节点类型 → Vue 组件映射 */
const WORKFLOW_NODE_COMPONENTS: Record<WorkflowNodeType, Component> = {
  workflowStart: StartNode,
  workflowEnd: EndNode,
  workflowEditor: EditorNode,
  workflowFlow: FlowNode,
  workflowAI: AINode,
  workflowCondition: ConditionNode,
}

/** 节点类型 → 默认配置 */
const WORKFLOW_NODE_DEFAULTS: Record<WorkflowNodeType, WorkflowNodeDefaults> = {
  workflowStart: {
    label: '开始',
  },
  workflowEnd: {
    label: '结束',
  },
  workflowEditor: {
    name: '表单配置',
    schemaName: '未配置',
  },
  workflowFlow: {
    name: '子流程',
    flowName: '未配置',
  },
  workflowAI: {
    name: 'AI 任务',
    modelName: '未选择模型',
  },
  workflowCondition: {
    name: '条件判断',
    condition: '',
  },
}

/** 节点类型 → 尺寸 */
const WORKFLOW_NODE_SIZES: Record<WorkflowNodeType, { width: number; height: number }> = {
  workflowStart: { width: 200, height: 36 },
  workflowEnd: { width: 200, height: 36 },
  workflowEditor: { width: 220, height: 100 },
  workflowFlow: { width: 220, height: 100 },
  workflowAI: { width: 220, height: 100 },
  workflowCondition: { width: 60, height: 60 },
}

/** 节点验证规则 */
export interface NodeValidationError {
  nodeId: string
  message: string
  level: 'error' | 'warning'
}

function validateWorkflowNode(
  nodeId: string,
  nodeType: WorkflowNodeType,
  data: Record<string, unknown>,
): NodeValidationError[] {
  const errors: NodeValidationError[] = []

  switch (nodeType) {
    case 'workflowEditor':
      if (!data.schemaId) {
        errors.push({
          nodeId,
          message: '表单配置节点未关联表单',
          level: 'error',
        })
      }
      break
    case 'workflowFlow':
      if (!data.flowId) {
        errors.push({
          nodeId,
          message: '子流程节点未关联流程',
          level: 'error',
        })
      }
      break
    case 'workflowAI':
      if (!data.modelName) {
        errors.push({
          nodeId,
          message: 'AI 节点未选择模型',
          level: 'warning',
        })
      }
      break
    case 'workflowCondition':
      if (!data.condition) {
        errors.push({
          nodeId,
          message: '条件节点未设置条件表达式',
          level: 'error',
        })
      }
      break
  }

  return errors
}

/**
 * Workflow 节点管理 composable
 * 提供节点类型注册、默认配置、验证等能力
 */
export function useWorkflowNodes() {
  /** 获取 Vue Flow 节点类型注册表 */
  const nodeTypes = computed(() => WORKFLOW_NODE_COMPONENTS)

  /** 获取节点默认数据 */
  function getDefaultData(nodeType: WorkflowNodeType): WorkflowNodeDefaults {
    return { ...WORKFLOW_NODE_DEFAULTS[nodeType] }
  }

  /** 获取节点尺寸 */
  function getNodeSize(nodeType: WorkflowNodeType) {
    return { ...WORKFLOW_NODE_SIZES[nodeType] }
  }

  /** 验证单个节点 */
  function validateNode(
    nodeId: string,
    nodeType: WorkflowNodeType,
    data: Record<string, unknown>,
  ): NodeValidationError[] {
    return validateWorkflowNode(nodeId, nodeType, data)
  }

  /** 批量验证多个节点 */
  function validateNodes(
    nodes: Array<{ id: string; type: string; data?: Record<string, unknown> }>,
  ): NodeValidationError[] {
    const errors: NodeValidationError[] = []
    for (const node of nodes) {
      if (isWorkflowNodeType(node.type)) {
        errors.push(...validateNode(node.id, node.type, node.data ?? {}))
      }
    }
    return errors
  }

  /** 判断是否为 Workflow 节点类型 */
  function isWorkflowNodeType(type: string): type is WorkflowNodeType {
    return type in WORKFLOW_NODE_COMPONENTS
  }

  return {
    nodeTypes,
    getDefaultData,
    getNodeSize,
    validateNode,
    validateNodes,
    isWorkflowNodeType,
    WORKFLOW_NODE_COMPONENTS,
    WORKFLOW_NODE_DEFAULTS,
    WORKFLOW_NODE_SIZES,
  }
}
