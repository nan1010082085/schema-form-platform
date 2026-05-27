/**
 * 运行时系统文档类型定义
 *
 * 四大运行时系统：变量（核心支撑）、事件、规则（联动）、数据源
 */

/** 引用前缀 — 条件表达式中可用的数据来源 */
export type ReferencePrefix =
  | 'formData'    // 表单数据
  | 'values'      // formData 别名
  | 'variables'   // 用户定义变量
  | 'exposed'     // 组件暴露值
  | '$widget'     // 组件配置
  | '$user'       // 用户上下文

/** 变量作用域 */
export type VariableScope = 'board' | 'widget'

/** 变量类型 */
export type VariableType = 'string' | 'number' | 'boolean' | 'object' | 'array'

/** 变量定义文档 */
export interface VariableDoc {
  /** 变量名 */
  name: string
  /** 变量类型 */
  type: VariableType
  /** 作用域 */
  scope: VariableScope
  /** 默认值 */
  defaultValue?: unknown
  /** 说明 */
  description: string
}

/** 组件暴露值定义 */
export interface ExposedValueDoc {
  /** 引用 key */
  key: string
  /** 值类型 */
  type: VariableType
  /** 说明 */
  description: string
  /** 示例值 */
  example?: unknown
}

/** 组件可接收事件定义 */
export interface ReceivableEventDoc {
  /** 事件名 */
  name: string
  /** 说明 */
  description: string
  /** 参数说明 */
  params?: Record<string, string>
}

/** 事件动作类型文档 */
export interface EventActionDoc {
  /** 动作类型标识 */
  type: string
  /** 动作名称 */
  label: string
  /** 说明 */
  description: string
  /** 必需配置项 */
  requiredFields: string[]
  /** 可选配置项 */
  optionalFields?: string[]
  /** 使用示例 */
  example?: Record<string, unknown>
}

/** 联动类型文档 */
export interface LinkageTypeDoc {
  /** 联动类型标识 */
  type: string
  /** 联动名称 */
  label: string
  /** 说明 */
  description: string
  /** 条件为真时的行为 */
  whenTrue: string
  /** 条件为假时的行为 */
  whenFalse: string
  /** 配置示例 */
  example?: Record<string, unknown>
}

/** 数据源配置文档 */
export interface DataSourceDoc {
  /** 配置字段 */
  field: string
  /** 字段类型 */
  type: string
  /** 默认值 */
  default: string
  /** 说明 */
  description: string
}

/** 流程图节点 */
export interface FlowNode {
  /** 节点 ID */
  id: string
  /** 节点标签 */
  label: string
  /** 节点类型 */
  type: 'trigger' | 'condition' | 'action' | 'state' | 'output'
  /** 说明 */
  description?: string
}

/** 流程图边 */
export interface FlowEdge {
  /** 源节点 */
  from: string
  /** 目标节点 */
  to: string
  /** 边标签 */
  label?: string
  /** 条件 */
  condition?: string
}

/** 流程图定义 */
export interface FlowDiagram {
  /** 流程名称 */
  name: string
  /** 流程说明 */
  description: string
  /** 节点列表 */
  nodes: FlowNode[]
  /** 边列表 */
  edges: FlowEdge[]
  /** 文本表示（ASCII 流程图） */
  textDiagram: string
}

/** 场景示例 */
export interface ScenarioDoc {
  /** 场景名称 */
  name: string
  /** 场景说明 */
  description: string
  /** 涉及的系统 */
  systems: ('variables' | 'events' | 'linkage' | 'datasource')[]
  /** 配置步骤 */
  steps: string[]
  /** 流程图 */
  flow: FlowDiagram
  /** Schema 示例 */
  schemaExample?: string
}

/** 运行时系统文档 */
export interface RuntimeSystemDoc {
  /** 系统 ID */
  id: string
  /** 系统名称 */
  name: string
  /** 系统定位 */
  role: 'core' | 'config'
  /** 说明 */
  description: string
  /** 核心概念 */
  concepts: string[]
  /** 配置项 */
  configItems: Array<{
    name: string
    type: string
    description: string
  }>
  /** 与其他系统的关系 */
  relations: Array<{
    target: string
    relation: 'reads' | 'writes' | 'triggers' | 'supports'
    description: string
  }>
  /** 使用场景 */
  scenarios: ScenarioDoc[]
}
