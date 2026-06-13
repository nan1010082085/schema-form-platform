/**
 * 变量系统文档
 *
 * 定位：核心支撑系统，连接事件、规则（联动）、数据源三大配置
 *
 * 两种变量类型：
 * - 用户变量 (StateVars)：用户在编辑器中定义，运行时可读写
 * - 组件暴露值 (ExposedValues)：组件在 config.ts 中声明，运行时只读
 */
import type { RuntimeSystemDoc } from './types'

export const variableSystem: RuntimeSystemDoc = {
  id: 'variables',
  name: '变量系统',
  role: 'core',
  description:
    '变量系统是三大配置（事件、规则、数据源）的核心支撑。' +
    '提供统一的数据引用协议，使条件表达式、事件动作、联动规则能够访问和修改运行时状态。',

  concepts: [
    '用户变量 (StateVars) — 用户自定义的全局/组件级状态，支持运行时读写',
    '组件暴露值 (ExposedValues) — 组件声明的内部状态快照，供其他组件联动使用',
    '变量作用域 — 画布级 (board) 所有组件共享，组件级 (widget) 仅组件内部',
    '引用协议 — 统一的表达式前缀语法：variables.xxx / exposed.xxx / formData.xxx',
    '响应式传播 — 变量变化自动触发依赖它的联动/事件条件重新求值',
  ],

  configItems: [
    { name: 'name', type: 'string', description: '变量名，仅支持字母、数字、下划线，字母开头' },
    { name: 'type', type: 'VariableType', description: '变量类型: string / number / boolean / object / array' },
    { name: 'defaultValue', type: 'unknown', description: '默认值，初始化时使用' },
    { name: 'description', type: 'string', description: '变量用途说明（可选）' },
  ],

  relations: [
    { target: 'events', relation: 'writes', description: '事件动作 set-variable 修改变量值' },
    { target: 'events', relation: 'reads', description: '事件条件表达式读取变量' },
    { target: 'linkage', relation: 'reads', description: '联动条件表达式读取变量和暴露值' },
    { target: 'datasource', relation: 'reads', description: '数据源条件表达式读取变量' },
  ],

  scenarios: [],
}

// ============================================================
// 用户变量 (StateVars) 详解
// ============================================================

export const stateVariables = {
  title: '用户变量 (StateVars)',

  definition: `
interface WidgetVariable {
  name: string           // 变量名
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  defaultValue?: unknown // 默认值
  description?: string   // 说明
}

// 完全相同的结构用于画布级和组件级
type BoardVariable = WidgetVariable`,

  scopes: {
    board: {
      title: '画布级变量',
      storage: 'useBoardStore.variables',
      description: '所有组件共享，适合存储全局状态如用户角色、环境标识等',
      example: `// 画布变量
[
  { name: 'isAdmin', type: 'boolean', defaultValue: false, description: '是否管理员' },
  { name: 'env', type: 'string', defaultValue: 'prod', description: '环境标识' },
  { name: 'selectedDept', type: 'object', defaultValue: null, description: '当前选中部门' },
]`,
      access: 'variables.isAdmin / variables.env / variables.selectedDept',
    },
    widget: {
      title: '组件级变量',
      storage: 'widget.variables',
      description: '仅组件内部可用，适合存储组件私有状态',
      example: `// 组件变量
[
  { name: 'pageSize', type: 'number', defaultValue: 10, description: '每页条数' },
  { name: 'sortField', type: 'string', defaultValue: 'createdAt', description: '排序字段' },
]`,
      access: 'variables.pageSize / variables.sortField',
    },
  },

  lifecycle: `
1. 初始化: 从 defaultValue 创建变量快照
2. 运行时: 通过 set-variable 动作修改
3. 传播: variablesContext 响应式更新 → useLinkage / eventEngine 自动重算
4. 销毁: 组件卸载时，组件级变量随之销毁；画布级变量随画布销毁`,

  runtimeAPI: `
// 需要暴露的运行时 API (待实现)
interface VariableAPI {
  getVariable(name: string): unknown           // 读取变量
  setVariable(name: string, value: unknown): void // 设置变量
  getVariables(): Record<string, unknown>      // 获取所有变量
}`,
}

// ============================================================
// 组件暴露值 (ExposedValues) 详解
// ============================================================

export const exposedValues = {
  title: '组件暴露值 (ExposedValues)',

  definition: `
// 组件在 config.ts 中声明
interface ExposedValueConfig {
  key: string           // 引用 key
  type: VariableType    // 值类型
  description: string   // 说明
  example?: unknown     // 示例值
}`,

  declarationExample: `
// widgets/search-list/config.ts
export const config: WidgetConfig = {
  type: 'search-list',
  label: '搜索列表',
  configPanels: ['events', 'api', 'variables'],

  // 声明组件暴露的运行时值
  exposedValues: [
    { key: 'selectedRows', type: 'array', description: '当前选中行', example: [] },
    { key: 'loading', type: 'boolean', description: '加载状态', example: false },
    { key: 'pagination', type: 'object', description: '分页信息', example: { page: 1, pageSize: 10, total: 0 } },
    { key: 'dataSource', type: 'array', description: '当前数据列表', example: [] },
  ],

  // 声明组件可接收的事件
  receivableEvents: [
    { name: 'refresh', description: '刷新数据' },
    { name: 'reset-search', description: '重置搜索条件' },
  ],
}`,

  runtimeBinding: `
// 组件内部实现 (以 search-list 为例)
const exposedState = reactive({
  selectedRows: [],
  loading: false,
  pagination: { page: 1, pageSize: 10, total: 0 },
  dataSource: [],
})

// 通过 provide 注入，供 RuntimeContext 收集
provide(widgetExposedKey(widget.id), exposedState)

// RuntimeContext 收集所有组件的暴露值
const exposedContext = computed(() => {
  const result: Record<string, Record<string, unknown>> = {}
  // 遍历所有 widget，inject 每个的 exposedState
  for (const widget of allWidgets) {
    const state = inject(widgetExposedKey(widget.id), null)
    if (state) result[widget.id] = state
  }
  return result
})`,

  access: 'exposed.list_123.selectedRows / exposed.list_123.loading',
}

// ============================================================
// 引用协议
// ============================================================

export const referenceProtocol = {
  title: '统一引用协议',

  description: '所有条件表达式中可用的数据来源，通过前缀区分',

  prefixes: [
    { prefix: 'formData', alias: 'values', description: '当前表单数据', example: 'formData.name === "admin"' },
    { prefix: 'variables', alias: '—', description: '用户定义变量', example: 'variables.isAdmin === true' },
    { prefix: 'exposed', alias: '—', description: '组件暴露值', example: 'exposed.list_1.selectedRows.length > 0' },
    { prefix: '$widget', alias: '—', description: '组件配置（只读）', example: '$widget.btn_1.props.disabled' },
    { prefix: '$user', alias: '—', description: '用户上下文', example: '$user.roles.includes("admin")' },
  ],

  expressionSandbox: `
// 条件表达式编译过程
function compileCondition(expression: string) {
  // 1. 安全检查 (checkSecurity)
  // 2. 编译为函数
  const fn = new Function(
    'values',       // formData 别名
    'variables',    // 用户变量
    'exposed',      // 组件暴露值
    '$widget',      // 组件配置
    '$user',        // 用户上下文
    \`"use strict"; return (\${expression});\`
  )
  return (context) => fn(
    context.formData,
    context.variables,
    context.exposed,
    context.$widget,
    context.$user
  )
}`,
}

// ============================================================
// 响应式传播链
// ============================================================

export const reactivePropagation = {
  title: '响应式传播链',

  description: '变量变化如何驱动 UI 更新的完整链路',

  chain: `
触发源 (任一)
  │
  ├── 用户操作 → eventEngine → set-variable 动作
  ├── 组件内部状态变化 → exposed 值更新
  └── API 数据返回 → formData 更新
  │
  ▼
RuntimeContext (Vue computed)
  ├── variablesContext: computed(() => { ...boardVars, ...widgetVars, ...runtimeVars })
  └── exposedContext: computed(() => { widget1: {...}, widget2: {...} })
  │
  ▼
useLinkage(schema, formData, variablesContext)
  └── stateMap: computed(() => {
        // 读取 formData[watchField] 建立依赖
        // 读取 variablesContext.value 建立依赖
        // 读取 exposedContext.value 建立依赖
        // 对每个 linkage 条件求值
        // 返回 Map<field, LinkageState>
      })
  │
  ▼
SchemaNode 读取 stateMap
  └── renderState.visible / disabled / required → 控制渲染`,

  keyPoint: '关键：Vue 的响应式系统自动追踪依赖。当 variables / exposed / formData 变化时，所有依赖它们的 computed 自动重算，无需手动通知。',
}

export default {
  variableSystem,
  stateVariables,
  exposedValues,
  referenceProtocol,
  reactivePropagation,
}
