/**
 * 构建时提取脚本 — 从 editor widget configs 和 flow node definitions
 * 提取 AI 所需的元数据，生成 packages/platform/ai/shared/metadata.json
 *
 * 运行：pnpm extract:ai-metadata
 * 自动接入：build:server 和 dev:server 前自动执行
 */

import { writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ────────────────────────────────────────────
// 类型定义（与 editor types.ts 对齐）
// ────────────────────────────────────────────

interface WidgetAIMetadata {
  type: string
  group: string
  canHaveChildren: boolean
  displayName: string
  description: string
  defaultProps: Record<string, unknown>
  keyProps: string[]
  defaultSize: { w: number; h: number } | null
  exposedValues: Array<{ key: string; type: string; description: string; example?: unknown }>
  receivableEvents: Array<{ name: string; description: string; params?: Record<string, string> }>
  eventTargets: Array<{ id: string; label: string; description?: string }>
  configPanels: string[]
}

interface FlowNodeAIMetadata {
  type: string
  label: string
  description: string
  size: { width: number; height: number }
  category: 'event' | 'task' | 'gateway' | 'container'
  configFields: Array<{ key: string; type: string; description: string }>
}

interface AIMetadata {
  version: string
  generatedAt: string
  widgets: WidgetAIMetadata[]
  flowNodes: FlowNodeAIMetadata[]
  systems: {
    eventActionTypes: string[]
    linkageTypes: string[]
    containerTypes: string[]
    variableTypes: string[]
  }
}

// ────────────────────────────────────────────
// Widget 元数据提取
// ────────────────────────────────────────────

// 从 index.ts 注册顺序提取 group 映射
const WIDGET_GROUPS: Record<string, string> = {
  card: 'layout', tabs: 'layout', 'single-col': 'layout', 'double-col': 'layout',
  'triple-col': 'layout', 'quad-col': 'layout', divider: 'layout', spacer: 'layout',
  form: 'container', dialog: 'container',
  input: 'form', select: 'form', number: 'form', radio: 'form', checkbox: 'form',
  date: 'form', textarea: 'form', richtext: 'form', upload: 'form', switch: 'form',
  slider: 'form', rate: 'form', 'date-time-slot': 'form', 'time-picker': 'form',
  cascader: 'form', 'color-picker': 'form', 'tag-input': 'form', autocomplete: 'form',
  title: 'static', banner: 'static',
  button: 'action', 'toolbar-buttons': 'action',
  table: 'table', 'search-list': 'table', 'editable-table': 'table',
  'tree-layout': 'business', 'file-list': 'business', transfer: 'business',
  'bar-chart': 'chart', 'line-chart': 'chart', 'pie-chart': 'chart',
  'scatter-chart': 'chart', radar: 'chart', gauge: 'chart',
  heatmap: 'chart', funnel: 'chart', candlestick: 'chart',
}

const CONTAINER_TYPES = new Set(['form', 'card', 'tabs', 'dialog', 'single-col', 'double-col', 'triple-col', 'quad-col'])

// 默认尺寸（从 publicSchema.ts 和各 schema.ts 提取）
const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  form: { w: 600, h: 600 }, dialog: { w: 600, h: 600 },
  card: { w: 600, h: 400 }, tabs: { w: 600, h: 400 },
  'single-col': { w: 600, h: 200 }, 'double-col': { w: 600, h: 200 },
  'triple-col': { w: 600, h: 200 }, 'quad-col': { w: 600, h: 200 },
  divider: { w: 280, h: 1 }, spacer: { w: 280, h: 20 },
  input: { w: 280, h: 44 }, select: { w: 280, h: 44 }, number: { w: 280, h: 44 },
  radio: { w: 280, h: 44 }, checkbox: { w: 280, h: 44 }, date: { w: 280, h: 44 },
  textarea: { w: 280, h: 80 }, richtext: { w: 400, h: 200 }, upload: { w: 280, h: 80 },
  switch: { w: 280, h: 44 }, slider: { w: 280, h: 44 }, rate: { w: 280, h: 44 },
  'date-time-slot': { w: 280, h: 44 }, 'time-picker': { w: 280, h: 44 },
  cascader: { w: 280, h: 44 }, 'color-picker': { w: 280, h: 44 },
  'tag-input': { w: 280, h: 44 }, autocomplete: { w: 280, h: 44 },
  title: { w: 300, h: 40 }, banner: { w: 600, h: 40 },
  button: { w: 120, h: 36 }, 'toolbar-buttons': { w: 400, h: 44 },
  table: { w: 600, h: 300 }, 'search-list': { w: 600, h: 500 }, 'editable-table': { w: 600, h: 300 },
  'tree-layout': { w: 600, h: 400 }, 'file-list': { w: 400, h: 300 }, transfer: { w: 400, h: 300 },
  'bar-chart': { w: 400, h: 300 }, 'line-chart': { w: 400, h: 300 }, 'pie-chart': { w: 400, h: 300 },
  'scatter-chart': { w: 400, h: 300 }, radar: { w: 400, h: 300 }, gauge: { w: 400, h: 300 },
  heatmap: { w: 400, h: 300 }, funnel: { w: 400, h: 300 }, candlestick: { w: 400, h: 300 },
}

// widget config 文件的静态导入映射（避免动态 import 的复杂性）
// 这些是从各 config.ts 提取的 AI 相关字段
// 实际运行时通过 tsx 直接 import 源文件

async function loadWidgetConfigs(): Promise<WidgetAIMetadata[]> {
  const widgets: WidgetAIMetadata[] = []

  // 用 fs 扫描 widget 目录
  const widgetsDir = join(ROOT, 'packages/platform/editor/src/widgets')
  const entries = readdirSync(widgetsDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const type = entry.name
    const configPath = join(widgetsDir, type, 'config.ts')

    try {
      statSync(configPath)
    } catch {
      continue // 没有 config.ts 的目录跳过
    }

    // 动态 import config.ts（tsx 会处理 TypeScript）
    const configUrl = pathToFileURL(configPath).href
    let mod: Record<string, unknown>
    try {
      mod = await import(configUrl) as Record<string, unknown>
    } catch (err) {
      console.warn(`[extract] 跳过 ${type}: import 失败`, err)
      continue
    }

    // 找到导出的 config 对象（通常是 xxxConfig）
    const configObj = findConfigExport(mod)
    if (!configObj) {
      console.warn(`[extract] 跳过 ${type}: 未找到 config 导出`)
      continue
    }

    const group = WIDGET_GROUPS[type] ?? 'form'
    const canHaveChildren = CONTAINER_TYPES.has(type)

    widgets.push({
      type,
      group,
      canHaveChildren,
      displayName: String(configObj.displayName ?? type),
      description: String(configObj.description ?? ''),
      defaultProps: (configObj.defaultProps as Record<string, unknown>) ?? {},
      keyProps: extractKeyProps(configObj),
      defaultSize: DEFAULT_SIZES[type] ?? null,
      exposedValues: (configObj.exposedValues as WidgetAIMetadata['exposedValues']) ?? [],
      receivableEvents: (configObj.receivableEvents as WidgetAIMetadata['receivableEvents']) ?? [],
      eventTargets: extractEventTargets(configObj),
      configPanels: (configObj.configPanels as string[]) ?? [],
    })
  }

  // 按 group 排序
  const groupOrder = ['container', 'layout', 'form', 'static', 'action', 'table', 'business', 'chart']
  widgets.sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group))

  return widgets
}

function findConfigExport(mod: unknown): Record<string, unknown> | null {
  if (!mod || typeof mod !== 'object') return null
  // 如果有 displayName 和 description，就是 config 对象
  const obj = mod as Record<string, unknown>
  if (obj.displayName && obj.description) return obj
  // 遍历导出找 config
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object' && (val as Record<string, unknown>).displayName) {
      return val as Record<string, unknown>
    }
  }
  return null
}

function extractKeyProps(config: Record<string, unknown>): string[] {
  const panel = config.propertyPanel as Record<string, unknown> | undefined
  if (!panel) return []
  const props = panel.props as Array<Record<string, unknown>> | undefined
  if (!Array.isArray(props)) return []
  return props.map(p => String(p.key ?? '')).filter(Boolean)
}

function extractEventTargets(config: Record<string, unknown>): WidgetAIMetadata['eventTargets'] {
  const targets = config.eventTargets
  if (!Array.isArray(targets)) return []
  return targets as WidgetAIMetadata['eventTargets']
}

// ────────────────────────────────────────────
// Flow 节点元数据提取
// ────────────────────────────────────────────

async function loadFlowNodeMetadata(): Promise<FlowNodeAIMetadata[]> {
  const nodes: FlowNodeAIMetadata[] = []

  // 从 flow/shared 导入类型定义
  const bpmn = await import('../packages/platform/flow/shared/src/types/bpmn.js')
  const constants = await import('../packages/platform/flow/shared/src/engine/constants.js')

  const BpmnElementType = bpmn.BpmnElementType
  const DEFAULT_NODE_SIZES = constants.DEFAULT_NODE_SIZES
  const DEFAULT_NODE_CONFIGS = constants.DEFAULT_NODE_CONFIGS

  // 节点描述映射
  const NODE_DESCRIPTIONS: Record<string, string> = {
    startEvent: '流程开始事件，每个流程必须有且仅有一个',
    endEvent: '流程结束事件，标记流程完成',
    timerEvent: '定时事件，支持延时、定时触发、周期执行',
    userTask: '用户任务，需要人工处理（审批、填写表单等）',
    serviceTask: '服务任务，自动调用 API 或执行函数',
    scriptTask: '脚本任务，执行 JavaScript/Groovy/Python 脚本',
    sendTask: '发送任务，向外部系统发送消息',
    receiveTask: '接收任务，等待外部消息触发',
    exclusiveGateway: '排他网关（XOR），根据条件走唯一分支',
    parallelGateway: '并行网关（AND），同时执行所有分支',
    inclusiveGateway: '包容网关（OR），执行满足条件的所有分支',
    subProcess: '子流程，嵌套执行另一套流程定义',
  }

  // 节点分类
  const NODE_CATEGORIES: Record<string, FlowNodeAIMetadata['category']> = {
    startEvent: 'event', endEvent: 'event', timerEvent: 'event',
    userTask: 'task', serviceTask: 'task', scriptTask: 'task', sendTask: 'task', receiveTask: 'task',
    exclusiveGateway: 'gateway', parallelGateway: 'gateway', inclusiveGateway: 'gateway',
    subProcess: 'container',
  }

  // 关键配置字段描述
  const CONFIG_FIELD_DESCRIPTIONS: Record<string, Record<string, string>> = {
    userTask: {
      assigneeType: '指派类型：user(指定用户)/role(按角色)/expression(表达式)',
      candidateUsers: '候选用户 ID 列表',
      candidateRoles: '候选角色 ID 列表',
      approvalMode: '审批模式：single(单人)/countersign(会签)/or-sign(或签)',
      formSchemaId: '关联的表单 Schema ID',
      formMode: '表单模式：edit(编辑)/view(只读)',
      rejectPolicy: '驳回策略：reject-on-all(全部驳回)/reject-on-any(任一驳回)',
    },
    serviceTask: {
      serviceType: '服务类型：http(API调用)/function(函数)/script(脚本)',
      apiConfig: 'API 配置（url, method, params, headers, body）',
    },
    timerEvent: {
      timerType: '定时类型：duration(延时)/date(定时)/cycle(周期)',
      timerValue: '定时值（ISO 8601 格式，如 PT1H 表示1小时）',
    },
    exclusiveGateway: {
      gatewayDirection: '方向：diverging(发散)/converging(汇聚)',
      defaultFlow: '默认流边 ID（所有条件都不满足时走此边）',
    },
  }

  for (const type of Object.values(BpmnElementType)) {
    const size = DEFAULT_NODE_SIZES[type]
    const defaults = DEFAULT_NODE_CONFIGS[type] ?? {}
    const description = NODE_DESCRIPTIONS[type] ?? type
    const category = NODE_CATEGORIES[type] ?? 'task'

    // 提取关键配置字段
    const configFields = CONFIG_FIELD_DESCRIPTIONS[type]
      ? Object.entries(CONFIG_FIELD_DESCRIPTIONS[type]).map(([key, desc]) => ({
          key,
          type: typeof (defaults as Record<string, unknown>)[key] ?? 'unknown',
          description: desc,
        }))
      : []

    nodes.push({
      type,
      label: String((defaults as Record<string, unknown>).label ?? type),
      description,
      size,
      category,
      configFields,
    })
  }

  return nodes
}

// ────────────────────────────────────────────
// 系统类型提取
// ────────────────────────────────────────────

function extractSystemTypes() {
  return {
    // EventActionType — 从 types.ts 提取
    eventActionTypes: [
      'show', 'hide', 'open-dialog', 'close-dialog', 'switch-tab',
      'set-value', 'submit', 'reset', 'emit', 'set-variable',
      'trigger-event', 'post-message', 'close-tab', 'copy', 'refresh',
      'api', 'navigate',
    ],
    // LinkageType
    linkageTypes: ['visible', 'disabled', 'required', 'options', 'set-value', 'reset-fields'],
    // ContainerType
    containerTypes: ['form', 'card', 'tabs', 'dialog', 'single-col', 'double-col', 'triple-col', 'quad-col'],
    // 变量类型
    variableTypes: ['string', 'number', 'boolean', 'object', 'array'],
  }
}

// ────────────────────────────────────────────
// 主流程
// ────────────────────────────────────────────

async function main() {
  console.log('[extract-ai-metadata] 开始提取 AI 元数据...')

  const [widgets, flowNodes] = await Promise.all([
    loadWidgetConfigs(),
    loadFlowNodeMetadata(),
  ])

  const metadata: AIMetadata = {
    version: new Date().toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    widgets,
    flowNodes,
    systems: extractSystemTypes(),
  }

  // 输出到 packages/platform/ai/shared/metadata.json
  const outDir = resolve(ROOT, 'packages/platform/ai/shared')
  mkdirSync(outDir, { recursive: true })

  const outPath = resolve(outDir, 'metadata.json')
  writeFileSync(outPath, JSON.stringify(metadata, null, 2), 'utf-8')

  console.log(`[extract-ai-metadata] 完成：`)
  console.log(`  - Widget: ${widgets.length} 个`)
  console.log(`  - Flow 节点: ${flowNodes.length} 个`)
  console.log(`  - 输出: ${outPath}`)
}

main().catch((err) => {
  console.error('[extract-ai-metadata] 失败:', err)
  process.exit(1)
})
