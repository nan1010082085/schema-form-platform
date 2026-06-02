/**
 * @schema-form/shared-ai
 *
 * AI 智能体所需的元数据和 prompt 构建能力。
 * 从 editor widget configs 和 flow node definitions 构建时提取，
 * 保证 AI 知识与编辑器/流程引擎单一数据源。
 */

// 类型
export type {
  WidgetAIMetadata,
  FlowNodeAIMetadata,
  AIMetadata,
} from './types.js'

// Prompt 构建器
export {
  buildEditorSystemPrompt,
  buildFlowSystemPrompt,
  ROUTER_SYSTEM_PROMPT,
} from './promptBuilder.js'

// 系统知识（事件、联动、变量、数据源）
export {
  EVENT_ACTION_TYPES,
  EVENT_ACTION_DESCRIPTIONS,
  EVENT_ACTION_FIELDS,
  EVENT_TRIGGERS,
  LINKAGE_TYPES,
  LINKAGE_DESCRIPTIONS,
  VARIABLE_TYPES,
  VARIABLE_SCOPE_DESCRIPTIONS,
  API_CONFIG_FIELDS,
  OUTPUT_TAGS,
} from './systemKnowledge.js'
