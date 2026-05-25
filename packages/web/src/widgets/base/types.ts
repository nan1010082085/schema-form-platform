import type { InjectionKey, ComputedRef, Ref } from 'vue'

// ============================================================
// SchemaType — 组件类型枚举
// ============================================================

/** 容器组件类型 */
export type ContainerType = 'form' | 'card' | 'row-col' | 'tabs' | 'dialog'

/** 基础组件类型 */
export type BasicType =
  | 'input'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'date-range'
  | 'textarea'
  | 'richtext'
  | 'button'
  | 'upload'
  | 'table'
  | 'search-list'
  | 'editable-table'
  | 'title'
  | 'divider'
  | 'spacer'
  | 'toolbar-buttons'
  | 'file-list'
  | 'transfer'
  | 'banner'
  | 'tree-layout'
  | 'date-time-slot'
  | 'pagination'
  | 'file-preview'
  | 'grid-row'
  | 'grid-col'
  | 'page'
  | 'toolbar'
  | 'steps'

/** 所有组件类型 */
export type SchemaType = ContainerType | BasicType

// ============================================================
// 表单字段值类型
// ============================================================

export type FormFieldValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | number[]
  | Record<string, unknown>
  | Record<string, unknown>[]

// ============================================================
// 字典项
// ============================================================

export interface DictItem {
  label: string
  value: string | number | boolean
  id?: string | number
  children?: DictItem[]
}

// ============================================================
// 校验规则（Element Plus FormItemRule）
// ============================================================

export type SchemaRules = FormItemRule[]

interface FormItemRule {
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'url' | 'email' | 'enum'
  required?: boolean
  message?: string
  trigger?: string | string[]
  min?: number
  max?: number
  len?: number
  pattern?: RegExp
  validator?: (rule: unknown, value: unknown, callback: (error?: Error) => void) => void
}

// ============================================================
// Widget 变量
// ============================================================

export interface WidgetVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  defaultValue?: unknown
  description?: string
}

// ============================================================
// 事件动作
// ============================================================

/** 事件动作类型 */
export type EventActionType =
  | 'show' | 'hide'
  | 'open-dialog' | 'close-dialog'
  | 'switch-tab'
  | 'set-value'
  | 'submit' | 'reset'
  | 'emit'
  | 'set-variable'    // 修改用户变量
  | 'trigger-event'   // 触发目标组件的指定事件
  | 'post-message'    // 向父窗口发送 postMessage
  | 'close-tab'       // 关闭浏览器页签
  | 'copy'            // 复制文本到剪贴板
  | 'refresh'         // 刷新目标组件数据
  | 'api'             // 调用后端 API
  | 'navigate'        // 路由跳转

/** 事件动作 */
export interface SchemaEventAction {
  type: EventActionType
  /** 目标组件 ID 或弹窗 ID */
  target?: string
  /** 附带值（如切换到哪个标签、emit 的 payload） */
  value?: unknown
  // ---- set-variable 专用 ----
  /** 变量名 */
  variable?: string
  // ---- trigger-event 专用 ----
  /** 要触发的事件名 */
  event?: string
  // ---- post-message 专用 ----
  /** 消息内容 */
  message?: Record<string, unknown>
  // ---- copy 专用 ----
  /** 要复制的文本（支持 formData.xxx 引用） */
  text?: string
  // ---- api 专用 ----
  /** API 地址 */
  apiUrl?: string
  /** 请求方法 */
  apiMethod?: 'get' | 'post' | 'put' | 'delete'
  /** 请求参数，'formData' 表示使用表单数据 */
  apiParams?: Record<string, unknown> | 'formData'
  // ---- navigate 专用 ----
  /** 路由路径 */
  navigatePath?: string
  /** 路由查询参数 */
  navigateQuery?: Record<string, string>
}

// ============================================================
// Widget 事件
// ============================================================

export interface WidgetEvent {
  /** 触发事件名（click / change / close 等） */
  trigger: string
  /** 事件目标（部件内部元素标识，为空则绑定到整个部件） */
  eventTarget?: string
  /** 执行条件表达式 */
  condition?: string
  /** 执行前确认提示 */
  confirm?: string
  actions: SchemaEventAction[]
}

/** 事件目标配置 — 声明部件内可绑定事件的子元素 */
export interface EventTargetConfig {
  /** 目标标识（传给 triggerWidgetEvent 的第三个参数） */
  id: string
  /** 显示名称 */
  label: string
  /** 描述 */
  description?: string
}

// ============================================================
// Widget 规则
// ============================================================

/** 规则监听源 */
export interface WidgetRuleWatch {
  type: 'field' | 'action' | 'dialog-callback'
  /** 字段名 / 动作名 / 弹窗ID */
  source: string
}

/** 规则动作 */
export interface WidgetRuleAction {
  type: 'fetch-data' | 'set-value' | 'submit' | 'validate' | 'reset' | 'hide' | 'visible' | 'disabled'
  /** 动作配置（API地址、目标字段、参数等） */
  config: Record<string, unknown>
  /** 成功回调 */
  onSuccess?: SchemaEventAction[]
  /** 失败回调 */
  onError?: SchemaEventAction[]
}

/** @deprecated 使用 SchemaLinkage 替代 */
export interface WidgetRule {
  /** 监听源列表 */
  watches: WidgetRuleWatch[]
  /** 判断条件表达式 */
  condition: string
  /** 执行动作列表 */
  actions: WidgetRuleAction[]
}

// ============================================================
// 搜索字段配置
// ============================================================

/** 搜索字段配置 */
export interface SearchFieldConfig {
  /** 字段名（作为 API 查询参数 key） */
  field: string
  /** 显示标签 */
  label: string
  /** 搜索控件类型 */
  type: 'input' | 'select' | 'date' | 'date-range'
  /** 占位文字 */
  placeholder?: string
  /** 下拉选项（type=select 时使用） */
  options?: { label: string; value: string | number | boolean }[]
  /** 默认值 */
  defaultValue?: unknown
}

// ============================================================
// API 数据源配置
// ============================================================

/** 动态数据请求配置 */
export interface SchemaApiConfig {
  url: string
  method?: 'get' | 'post'
  params?: Record<string, unknown>
  dataPath?: string      // dot-notation path to data array (e.g. "result.records"). Falls back to data > list > rows > items > records
  labelKey?: string      // 默认 'label'
  valueKey?: string      // 默认 'value'
  childrenKey?: string   // 树形数据子节点字段（保留树形结构不拍平）
  ttl?: number           // 缓存 TTL（毫秒），默认 0 = 永不过期
  immediate?: boolean    // 默认 true，挂载时加载
  dictCode?: string      // 从 global.dictMap 查找（优先于 url）
  cacheLevel?: 'memory' | 'indexeddb' | 'both'  // 缓存策略，默认 'memory'
  enableRetry?: boolean  // 开启重试，默认 false，开启后重试 3 次（最高 5 次）
}

// ============================================================
// 联动配置
// ============================================================

/** 联动类型 */
export type LinkageType = 'visible' | 'disabled' | 'required' | 'options' | 'set-value' | 'reset-fields'

/** 联动配置 */
export interface SchemaLinkage {
  /** 联动类型 */
  type: LinkageType
  /** 监听的字段列表 */
  watchFields: string[]
  /** 联动条件 — 函数或字符串表达式 */
  condition: string | ((values: Record<string, FormFieldValue>) => boolean)
  /** options 联动时，条件为真的静态选项 */
  thenOptions?: DictItem[]
  /** options 联动时，条件为真的动态 API 配置 */
  thenApi?: SchemaApiConfig
  /** 条件为假时的回退值（visible=false, disabled=false 等） */
  elseValue?: FormFieldValue
  /** set-value 联动：条件为真时设置的字面值 */
  thenValue?: FormFieldValue
  /** set-value 联动：条件为真时复制值来源字段 */
  valueSource?: string
  /** reset-fields 联动：条件为真时要重置的目标字段列表 */
  targetFields?: string[]
}

/** 联动计算后的字段状态 */
export interface LinkageState {
  /** 是否可见 */
  visible: boolean
  /** 是否禁用 */
  disabled: boolean
  /** 是否必填 */
  required: boolean
  /** options 联动覆盖的静态选项 */
  options?: DictItem[]
  /** options 联动覆盖的 API 配置 */
  optionsApi?: SchemaApiConfig
  /** elseValue: 联动条件为 false 时回退到此值 */
  elseValue?: FormFieldValue
  /** set-value 联动设置的目标值 */
  targetValue?: FormFieldValue
  /** reset-fields 联动：条件为真时要重置的目标字段列表 */
  resetFields?: string[]
}

// ============================================================
// 属性面板配置类型
// ============================================================

/** 配置面板类型（属性面板底部的弹框入口按钮） */
export type ConfigPanelType = 'events' | 'rules' | 'api' | 'variables'

/** 属性面板声明中的基础属性快捷键 */
export type BasicPropKey = 'field' | 'label' | 'defaultValue' | 'hidden' | 'options' | 'validationRules'

/** 属性面板声明中的属性项（字符串快捷键 或 完整配置对象） */
export type PropertyPanelItem =
  | BasicPropKey
  | {
      key: string
      label: string
      type: string
      default?: unknown
      desc?: string
      placeholder?: string
      options?: { label: string; value: string | number | boolean }[]
      fields?: ArrayFieldSchema[]
      visibleOn?: string
    }

/** 属性面板声明 */
export interface PropertyPanelConfig {
  basic?: PropertyPanelItem[]
  style?: string[]
  props?: PropertyPanelItem[]
}

/** Widget 完整配置（config.ts 导出的对象结构） */
export interface WidgetConfig {
  name: string
  displayName: string
  description: string      // 部件描述，用于属性面板 tooltip
  defaultStyle?: Record<string, unknown>
  defaultProps?: Record<string, unknown>
  propertyPanel?: PropertyPanelConfig
  configPanels?: ConfigPanelType[]
  /** 事件目标列表 — 声明部件内可独立绑定事件的子元素（支持静态数组或动态函数） */
  eventTargets?: EventTargetConfig[] | ((widget: Widget) => EventTargetConfig[])
  /** 组件暴露的运行时值 — 供联动条件表达式引用 exposed.widgetId.xxx */
  exposedValues?: ExposedValueConfig[]
  /** 组件可接收的外部事件 — 由事件引擎 trigger-event 动作触发 */
  receivableEvents?: ReceivableEventConfig[]
}

/** 组件暴露值配置 */
export interface ExposedValueConfig {
  /** 引用 key，如 selectedRows / loading */
  key: string
  /** 值类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  /** 说明 */
  description: string
  /** 示例值 */
  example?: unknown
}

/** 组件可接收事件配置 */
export interface ReceivableEventConfig {
  /** 事件名，如 refresh / reset-search */
  name: string
  /** 说明 */
  description: string
  /** 参数说明 */
  params?: Record<string, string>
}

/** 通用数组编辑器字段声明 */
export interface ArrayFieldSchema {
  key: string
  label: string
  type: 'text' | 'select' | 'number' | 'switch'
  options?: { label: string; value: string | number | boolean }[]
  default?: unknown
  placeholder?: string
}

// ============================================================
// Widget
// ============================================================

export interface Widget {
  // === 基础标识 ===
  /** 唯一 ID（组件Key + 5位随机Hash） */
  id: string
  /** 组件名称（如 'FgInput'） */
  name: string
  /** 组件类型 */
  type: SchemaType

  // === 属性配置 ===
  /** 表单字段名 */
  field?: string
  /** 组件标签 */
  label?: string
  /** 组件特有属性 */
  props?: Record<string, unknown>
  /** 选项列表 */
  options?: DictItem[]
  /** 默认值 */
  defaultValue?: FormFieldValue

  // === 位置配置 ===
  position: {
    x: number
    y: number
    w: number
    h: number
    zIndex?: number
  }

  // === 样式配置 ===
  /** 组件特有样式 */
  style?: Record<string, unknown>

  // === 变量 ===
  /** 组件内部变量 */
  variables?: WidgetVariable[]

  // === 事件 ===
  /** 组件事件列表 */
  events?: WidgetEvent[]

  // === 规则 ===
  /** 组件业务规则列表 */
  rules?: WidgetRule[]

  // === 联动 ===
  /** 组件联动规则列表（SchemaLinkage） */
  linkages?: SchemaLinkage[]

  // === 运行时状态（由规则引擎设置） ===
  /** 组件是否禁用（规则引擎可动态设置） */
  disabled?: boolean

  // === 数据源 ===
  /** API 数据源配置（用于动态加载 options 等） */
  api?: SchemaApiConfig

  // === 校验规则 ===
  /** 表单校验规则（Element Plus FormItemRule） */
  validationRules?: SchemaRules

  // === 容器绑定 ===
  /** 表单容器专用：绑定到哪个表单容器 */
  formId?: string
  /** 页签容器专用：绑定到哪个标签 */
  tabKey?: string
  /** 行列容器专用：绑定到哪一列 */
  colIndex?: number

  // === 静态属性 ===
  /** 设计时隐藏 */
  hidden?: boolean

  // === 布局属性（流式渲染器使用） ===
  /** 栅格列宽（1-24） */
  span?: number | Record<string, number>
  /** 表格列合并 */
  colspan?: number
  /** 表格行合并 */
  rowspan?: number
  /** CSS 宽度 */
  width?: string
  /** CSS 高度 */
  height?: string
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 显示边框 */
  border?: boolean

  // === 条件表达式 ===
  /** 条件可见 — 表达式求值为 true 时可见 */
  visibleOn?: string
  /** 条件禁用 — 表达式求值为 true 时禁用 */
  disabledOn?: string
  /** 条件必填 — 表达式求值为 true 时必填 */
  requiredOn?: string

  // === 按钮配置 ===
  /** 按钮文本 */
  text?: string
  /** 按钮类型 */
  buttonType?: '' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /** 图标 */
  icon?: string
  /** 按钮动作列表 */
  actions?: Record<string, unknown>[]
  /** 按钮组配置 */
  buttons?: Record<string, unknown>[]

  // === 表格/搜索列表 ===
  /** 列表 API 配置 */
  listApi?: Record<string, unknown>
  /** 搜索字段定义 */
  searchFields?: Record<string, unknown>[]
  /** 表格列定义 */
  columns?: Record<string, unknown>[]
  /** 行操作按钮 */
  rowActions?: Record<string, unknown>[]

  // === 高级配置 ===
  /** 边框隐藏 */
  hideBorder?: string[]
  /** 权限角色白名单 */
  permissionRoles?: string[]
  /** 只读模式 */
  readonly?: boolean
  /** 自定义 HTML 属性 */
  customAttrs?: Record<string, string>

  // === 子组件 ===
  /** 子 Widget 列表（容器组件） */
  children?: Widget[]

  // === 生命周期 ===
  /** Widget 生命周期钩子 */
  lifecycle?: WidgetLifecycleConfig
}

/**
 * PartialWidget — Widget 的 schema 存储形态
 *
 * 与 Widget 结构相同，但 id/name/position 为可选。
 * 用于 API 存储、文档示例、schema 导入导出等场景。
 * 编辑器加载后会补全为完整的 Widget。
 */
export type PartialWidget = Omit<Widget, 'id' | 'name' | 'position' | 'children'> & {
  id?: string
  name?: string
  position?: Widget['position']
  children?: PartialWidget[]
}

/** 全宽组件类型集合 — 这些组件在 grid-col 中渲染时强制占满整行 */
export const FULL_WIDTH_TYPES = [
  'table',
  'upload',
  'transfer',
  'banner',
  'tree-layout',
  'pagination',
  'file-list',
  'search-list',
  'editable-table',
] as const

/**
 * 判断组件类型是否为全宽组件
 * 全宽组件在 grid-col 中渲染时 span 强制为 24
 */
export function isFullWidthType(type: SchemaType): boolean {
  return (FULL_WIDTH_TYPES as readonly string[]).includes(type)
}

// ============================================================
// Board（画布）
// ============================================================

export interface CanvasConfig {
  width: number
  height: number
  backgroundColor: string
  padding: string
  /** 缩放比例 100-150 */
  zoom: number
}

export interface BoardVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  defaultValue?: unknown
  description?: string
}

export interface BoardEvent {
  trigger: 'mount' | 'submit' | 'reset' | 'custom'
  name?: string
  actions: SchemaEventAction[]
}

export interface Board {
  /** 画布实例 ID */
  id: string
  /** 画布名称 */
  name: string
  status: 'draft' | 'published'
  canvas: CanvasConfig
  variables: BoardVariable[]
  events: BoardEvent[]
  widgets: Widget[]
}

// ============================================================
// Injection Keys
// ============================================================

/** 注入当前 Widget 数据 */
export const widgetDataKey: InjectionKey<ComputedRef<Widget>> = Symbol('WidgetData')

/** 注入当前 Widget 样式配置 */
export const widgetStyleKey: InjectionKey<ComputedRef<Record<string, unknown>>> = Symbol('WidgetStyle')

// ============================================================
// Widget 渲染状态（规则引擎输出）
// ============================================================

/** 规则引擎计算的渲染状态 */
export interface WidgetRenderState {
  /** 是否可见 */
  visible: boolean
  /** 是否禁用 */
  disabled: boolean
  /** 是否必填 */
  required: boolean
}

/** 注入规则引擎计算的渲染状态 */
export const widgetRenderStateKey: InjectionKey<ComputedRef<WidgetRenderState>> = Symbol('WidgetRenderState')

// ============================================================
// 表单上下文（FgForm provide → SchemaNode inject）
// ============================================================

/** 表单上下文，由 FgForm 提供给子组件 */
export interface FormContext {
  /** el-form 组件引用 */
  formRef: Ref<unknown>
  /** 表单数据模型（field → value），绑定到 el-form :model */
  formModel: Record<string, unknown>
  /** 更新指定字段值（子组件通过 inject 调用） */
  updateField: (field: string, value: unknown) => void
}

/** 注入表单上下文（el-form ref + model） */
export const formContextKey: InjectionKey<FormContext> = Symbol('FormContext')

/** 组件暴露值注入 Key — 每个组件 provide 自己的 exposedState */
export const widgetExposedKey: InjectionKey<Record<string, unknown>> = Symbol('WidgetExposed')

// ============================================================
// Widget 生命周期
// ============================================================

/** 生命周期钩子：字符串表达式或函数 */
export type LifecycleHook = string | ((ctx: LifecycleContext) => void | Promise<void>)

/** 生命周期钩子配置 */
export interface WidgetLifecycleConfig {
  onInit?: LifecycleHook
  onMount?: LifecycleHook
  onUnmount?: LifecycleHook
  onDataChange?: LifecycleHook
  onVisibleChange?: LifecycleHook
  onBeforeSubmit?: LifecycleHook
  onAfterLoad?: LifecycleHook
  onOpen?: LifecycleHook
  onClose?: LifecycleHook
}

/** 生命周期执行上下文 */
export interface LifecycleContext {
  widget: Widget
  formData: Record<string, unknown>
  scopes: unknown[]
  field?: string
  value?: unknown
  logger: { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void; error: (...a: unknown[]) => void; debug: (...a: unknown[]) => void }
  [key: string]: unknown
}
