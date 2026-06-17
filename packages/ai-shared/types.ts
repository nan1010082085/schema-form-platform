/**
 * AI 元数据类型定义
 *
 * 与 metadata.json 结构对齐，供 server 和 promptBuilder 使用。
 */

// ────────────────────────────────────────────
// Widget 元数据
// ────────────────────────────────────────────

export interface WidgetAIMetadata {
  /** 组件类型标识（如 'input', 'select', 'table'） */
  type: string
  /** 分组：container / layout / form / static / action / table / business / chart */
  group: string
  /** 是否可以包含子组件 */
  canHaveChildren: boolean
  /** 显示名称 */
  displayName: string
  /** 组件描述 */
  description: string
  /** 默认属性 */
  defaultProps: Record<string, unknown>
  /** 关键属性列表（从 propertyPanel.props 提取） */
  keyProps: string[]
  /** 默认尺寸 */
  defaultSize: { w: number; h: number } | null
  /** 暴露的运行时值 */
  exposedValues: Array<{
    key: string
    type: string
    description: string
    example?: unknown
  }>
  /** 可接收的外部事件 */
  receivableEvents: Array<{
    name: string
    description: string
    params?: Record<string, string>
  }>
  /** 事件目标子元素 */
  eventTargets: Array<{
    id: string
    label: string
    description?: string
  }>
  /** 支持的配置面板 */
  configPanels: string[]
}

// ────────────────────────────────────────────
// Flow 节点元数据
// ────────────────────────────────────────────

export interface FlowNodeAIMetadata {
  /** 节点类型（如 'userTask', 'exclusiveGateway'） */
  type: string
  /** 节点标签 */
  label: string
  /** 节点描述 */
  description: string
  /** 默认尺寸 */
  size: { width: number; height: number }
  /** 分类：event / task / gateway / container */
  category: 'event' | 'task' | 'gateway' | 'container'
  /** 关键配置字段 */
  configFields: Array<{
    key: string
    type: string
    description: string
  }>
}

// ────────────────────────────────────────────
// 完整元数据结构
// ────────────────────────────────────────────

export interface AIMetadata {
  /** 版本日期 */
  version: string
  /** 生成时间 */
  generatedAt: string
  /** Widget 元数据列表 */
  widgets: WidgetAIMetadata[]
  /** Flow 节点元数据列表 */
  flowNodes: FlowNodeAIMetadata[]
  /** 系统类型 */
  systems: {
    eventActionTypes: string[]
    linkageTypes: string[]
    containerTypes: string[]
    variableTypes: string[]
  }
}
