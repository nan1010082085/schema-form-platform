/**
 * 运行时系统文档 — 统一导出
 *
 * 四大运行时系统:
 *   变量系统 (核心支撑) — 连接三大配置的公共语言
 *   事件系统 (配置) — 用户交互驱动的行为执行
 *   规则/联动系统 (配置) — 数据变化驱动的状态响应
 *   数据源系统 (配置) — 外部数据获取与缓存
 *
 * 核心要素:
 *   Widgets (部件) — 配置与渲染的基本单元
 *   Store (数据总成) — 全局状态管理
 */

// 类型导出
export type {
  ReferencePrefix,
  VariableScope,
  VariableType,
  VariableDoc,
  ExposedValueDoc,
  ReceivableEventDoc,
  EventActionDoc,
  LinkageTypeDoc,
  DataSourceDoc,
  FlowNode,
  FlowEdge,
  FlowDiagram,
  ScenarioDoc,
  RuntimeSystemDoc,
} from './types'

// 架构总览
export { architectureOverview, scenarios } from './architecture'

// 变量系统
export {
  variableSystem,
  stateVariables,
  exposedValues,
  referenceProtocol,
  reactivePropagation,
} from './variables'

// 事件系统
export {
  eventSystem,
  eventActionTypes,
  eventExecutionContext,
  eventExamples,
} from './events'

// 规则/联动系统
export {
  linkageSystem,
  linkageTypes,
  linkageCondition,
  linkageState,
  cycleDetection,
} from './linkage'

// 数据源系统
export {
  dataSourceSystem,
  dataSourceConfig,
  dataSourceFlow,
  dataSourceLinkage,
} from './datasource'
