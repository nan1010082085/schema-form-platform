/** 节点类型枚举 */
import type { InjectionKey, ComputedRef } from 'vue'
import type { FormItemRule } from 'element-plus'

/** 响应式 span 配置 — 断点定义与 Element Plus 一致 */
export interface ResponsiveSpan {
  /** < 576px */
  xs?: number
  /** >= 576px */
  sm?: number
  /** >= 768px */
  md?: number
  /** >= 992px */
  lg?: number
  /** >= 1200px */
  xl?: number
  /** >= 1600px */
  xxl?: number
}

/** 表单字段值类型 — 覆盖所有表单控件可能的值 */
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

/** 表单数据对象 */
export type FormData = Record<string, FormFieldValue>

/** 字典项 */
export interface DictItem {
  label: string
  value: string | number | boolean
  id?: string | number
  /** 树形数据的子节点（childrenKey 消费后保留原始嵌套） */
  children?: DictItem[]
}

/** 用户上下文 */
export interface UserContext {
  id: string
  name: string
  deptId: string
  deptName: string
  roles: string[]
  [key: string]: unknown
}

/** 请求上下文 */
export interface RequestContext {
  token: string
  headers: Record<string, string>
  baseUrl: string
  [key: string]: unknown
}

/** 全局配置上下文 */
export interface GlobalContext {
  /** 数据字典映射 */
  dictMap: Record<string, DictItem[]>
  /** 全局配置 */
  config: Record<string, unknown>
  [key: string]: unknown
}

/** FormGrid 上下文 */
export interface FormGridContext {
  user: UserContext
  request: RequestContext
  global: GlobalContext
}

/** 上下文注入 Key */
export const FORM_GRID_CONTEXT_KEY: InjectionKey<FormGridContext> = Symbol('FormGridContext')

/** 表单数据注入 Key */
export const FORM_GRID_FORM_KEY: InjectionKey<FormData> = Symbol('FormGridFormData')

/** 事件动作 emit 函数类型 */
export type ActionEmitFn = (event: string, payload?: unknown) => void

/** 动作注入 Key — 用于消除中间层事件转发 */
export const ACTION_EMIT_KEY: InjectionKey<ActionEmitFn> = Symbol('ActionEmit')

/** FormGrid API 注入 Key */
export interface FormGridApi {
  validate: () => Promise<boolean>
  validateField: (fields?: string | string[]) => Promise<boolean>
  getFormData: () => FormData
  resetFields: () => void
}

/** FormGrid API 注入 Key */
export const FORM_GRID_API_KEY: InjectionKey<FormGridApi> = Symbol('FormGridApi')

/** 表单国际化语言 */
export type FormGridLocale = 'zh-CN' | 'en-US'

/** 翻译函数类型 */
export type TranslateFn = (key: string, params?: Record<string, unknown>) => string

/** FormGrid 组件 Props 定义 */
export interface FormGridProps {
  /** 表单 schema 定义 */
  schema: FormSchemaItem[]
  /** 用户上下文 */
  user?: FormGridContext['user']
  /** 请求上下文 */
  request?: FormGridContext['request']
  /** 全局配置 */
  global?: FormGridContext['global']
  /** 生命周期钩子配置 */
  lifecycle?: FormLifecycleConfig
  /** API 数据加载配置 — 用于编辑场景的数据回填 */
  loadApi?: LoadApiConfig
  /** 国际化语言，默认 'zh-CN' */
  locale?: FormGridLocale
  /**
   * 提交前数据转换
   * 在 onBeforeSubmit 钩子和表单校验通过后、emit('submit') 前执行
   * 抛错时终止提交流程
   */
  transformBeforeSubmit?: (formData: FormData) => FormData | Promise<FormData>
  /**
   * 加载后数据转换
   * 在 loadApi 数据返回后、applyFieldMap 前执行
   * 抛错时使用原始数据降级
   */
  transformAfterLoad?: (rawData: Record<string, unknown>) => FormData | Promise<FormData>
  /**
   * 弹窗管理模式
   * - 'internal'（默认）：FormGrid 内部管理弹窗生命周期（打开/关闭），FgDialog 内置渲染
   * - 'external'：FormGrid 仅通过 @open-dialog 事件通知父组件，由父组件管理弹窗
   *   用于预览页、跨组件弹窗联动等场景
   */
  dialogMode?: 'internal' | 'external'
}

export type SchemaType =
  // 栅格布局
  | 'grid-row'
  | 'grid-col'
  // 页面布局
  | 'page'
  | 'toolbar'
  | 'card'
  | 'title'
  | 'divider'
  | 'spacer'
  // 基础表单组件
  | 'input'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'date-range'
  | 'textarea'
  | 'richtext'
  // 业务组件
  | 'button-list'
  | 'upload'
  | 'table'
  | 'pagination'
  | 'file-list'
  | 'file-preview'
  | 'person-select'
  | 'dept-select'
  | 'transfer'
  | 'detail-form'
  | 'banner'
  | 'tree-layout'
  | 'date-time-slot'
  | 'dialog'
  | 'toolbar-buttons'
  // 搜索列表
  | 'search-list'
  // 可编辑表格
  | 'editable-table'
  // 分步/标签页布局
  | 'steps'
  | 'tabs'

/** 全宽组件类型集合 — 这些组件在 grid-col 中渲染时强制占满整行 */
export const FULL_WIDTH_TYPES = [
  'table',
  'upload',
  'transfer',
  'banner',
  'tree-layout',
  'detail-form',
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

/** 动态数据请求配置 — 从 widgets/base/types 统一导出 */
import type { SchemaApiConfig } from '../../widgets/base/types'
export type { SchemaApiConfig }

/** 按钮动作类型 */
export type ActionType = 'emit' | 'dialog' | 'upload' | 'submit' | 'reset' | 'navigate' | 'api' | 'validate' | 'confirm'

/** emit 动作的 payload — 可以是任意可序列化值 */
export type ActionPayload = string | number | boolean | null | Record<string, unknown> | unknown[]

/** 按钮动作定义 */
export interface SchemaAction {
  type: ActionType
  label?: string
  confirm?: string           // 执行前确认提示
  disabled?: boolean
  // emit
  eventName?: string
  eventPayload?: ActionPayload
  // dialog
  dialogTitle?: string
  dialogWidth?: string
  dialogSchema?: FormSchemaItem[]
  // api
  apiUrl?: string
  apiMethod?: 'get' | 'post'
  apiParams?: Record<string, unknown> | 'formData'
  // navigate
  navigatePath?: string
  navigateQuery?: Record<string, string>
}

/** 按钮配置 */
export interface SchemaButtonConfig {
  text: string
  buttonType?: '' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  icon?: string
  disabled?: boolean
  loading?: boolean
  actions?: SchemaAction[]
}

/** Element Plus 表单校验规则 — 使用官方类型 */
export type SchemaRules = FormItemRule[]

/** 通用组件 props — 用 unknown 约束，消费方按类型断言 */
export type ComponentProps = Record<string, unknown>

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
  /** elseValue: 联动条件为 false 时回退到此值 (visible/disabled/required/options 类型) */
  elseValue?: FormFieldValue
  /** set-value 联动设置的目标值 */
  targetValue?: FormFieldValue
  /** reset-fields 联动：条件为真时要重置的目标字段列表 */
  resetFields?: string[]
}

/** 联动状态注入 Key */
export const FORM_GRID_LINKAGE_KEY: InjectionKey<ComputedRef<Map<string, LinkageState>>> = Symbol('FormGridLinkage')

/** 国际化翻译函数注入 Key */
export const FORM_GRID_T_KEY: InjectionKey<TranslateFn> = Symbol('FormGridTranslate')

/** 只读模式注入 Key — 禁用表单输入、隐藏内部按钮 */
export const FORM_GRID_READONLY_KEY: InjectionKey<ComputedRef<boolean>> = Symbol('FormGridReadonly')

/**
 * 生命周期钩子配置
 * 支持函数或字符串表达式两种模式（与 linkage.condition 共享沙箱模式）
 */
export interface FormLifecycleConfig {
  /** 表单挂载后触发（仅一次） */
  onFormMount?: string | ((formData: FormData) => void | Promise<void>)
  /** 任意字段值变化时触发（300ms 防抖，初始化阶段不触发） */
  onFieldChange?: string | ((field: string, value: FormFieldValue, formData: FormData) => void | Promise<void>)
  /** 提交前校验钩子，返回 false 可阻止提交 */
  onBeforeSubmit?: string | ((formData: FormData) => boolean | Promise<boolean>)
  /** loadApi 数据回填完成后触发 */
  onAfterLoad?: string | ((formData: FormData) => void | Promise<void>)
}

/**
 * API 数据加载配置 — 用于"编辑已有数据"场景
 * onMounted 时自动请求并回填 formData
 */
export interface LoadApiConfig {
  /** 接口地址 */
  url: string
  /** 请求方法，默认 get */
  method?: 'get' | 'post'
  /** 额外请求参数 */
  params?: Record<string, unknown>
  /**
   * 字段映射：API 返回字段名 → formData 字段名
   * 例如 { 'user_name': 'name', 'dept_id': 'department' }
   * 未指定时直接使用 API 返回的原始字段名
   */
  fieldMap?: Record<string, string>
}

/** List API configuration for search-list component */
export interface ListApiConfig {
  url: string
  method?: 'get' | 'post'
  extraParams?: Record<string, unknown>
  pageParam?: string      // default: 'pageNum'
  sizeParam?: string      // default: 'pageSize'
  dataPath?: string       // default: 'data', supports dot notation
  totalPath?: string      // default: 'total', supports dot notation
  immediate?: boolean     // default: true
  resetOnSearch?: boolean // default: true
}

/** Search field definition for inline search forms */
export interface SearchFieldSchema {
  type: 'input' | 'number' | 'select' | 'radio' | 'checkbox' | 'date' | 'date-range'
  field: string
  label?: string
  span?: number
  placeholder?: string
  options?: DictItem[]
  api?: SchemaApiConfig
  defaultValue?: FormFieldValue
  props?: Record<string, unknown>
}

/** Search list column schema — extends TableColumnSchema with display render modes */
export interface SearchListColumnSchema {
  prop: string
  label: string
  width?: string | number
  minWidth?: string | number
  fixed?: boolean | 'left' | 'right'
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  options?: DictItem[]
  api?: SchemaApiConfig
  render?: 'text' | 'tooltip' | 'tag' | 'link' | 'badge' | 'image' | 'custom'
  colorMap?: Record<string, string>
  tooltipField?: string
  linkEvent?: string
  imageWidth?: number
  renderFn?: string
}

/** Search list row action button configuration */
export interface SearchListRowAction {
  label: string
  buttonType?: '' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  type: 'emit' | 'api' | 'navigate' | 'dialog'
  emitEvent?: string
  apiUrl?: string
  apiMethod?: 'get' | 'post' | 'put' | 'delete'
  confirm?: string
  visibleOn?: string
  disabledOn?: string
  icon?: string
  // navigate
  navigatePath?: string
  navigateQuery?: Record<string, string>
  // dialog
  dialogTitle?: string
  dialogWidth?: string
  dialogSchema?: FormSchemaItem[]
}

/** 可编辑表格列 Schema — FgEditableTable 专用 */
export interface EditableTableColumn {
  /** 字段名，对应行数据的 key */
  prop: string
  /** 列标题 */
  label: string
  /** 表单组件类型 */
  type: 'input' | 'number' | 'select' | 'date' | 'textarea'
  /** 占位文本 */
  placeholder?: string
  /** 列宽度 (CSS 值，如 "200px") */
  width?: string
  /** select 类型的静态选项 */
  options?: DictItem[]
  /** select 类型的动态 API 配置 */
  api?: SchemaApiConfig
  /** 校验规则 */
  rules?: SchemaRules
  /** 是否必填 */
  required?: boolean
}

/** 表格列 Schema 定义 — 支持行内编辑 */
export interface TableColumnSchema {
  /** 字段名，对应行数据的 key */
  prop: string
  /** 列标题 */
  label: string
  /** 列类型 — 决定编辑态渲染的组件 */
  type?: 'text' | 'input' | 'number' | 'select' | 'date'
  /** 列宽度 */
  width?: string | number
  /** 最小列宽度 */
  minWidth?: string | number
  /** 固定列 */
  fixed?: boolean | 'left' | 'right'
  /** 是否可排序 */
  sortable?: boolean
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** select 类型的静态选项 */
  options?: DictItem[]
  /** select 类型的动态 API 配置 */
  api?: SchemaApiConfig
  /** 编辑态校验规则 */
  rules?: SchemaRules
  /** 是否可编辑，默认 true */
  editable?: boolean
}

/** 表格行操作配置 */
export interface TableRowAction {
  /** 操作类型 */
  type: 'add' | 'delete' | 'copy'
  /** 按钮文本 */
  label?: string
  /** 删除操作的确认提示文案 */
  confirm?: string
}

/** 组件样式配置 — 由 PropertyPanel 样式配置 tab 驱动 */
export interface ComponentStyle {
  width?: string
  height?: string
  margin?: string
  padding?: string
  border?: string
  borderTop?: string
  borderRight?: string
  borderBottom?: string
  borderLeft?: string
  backgroundColor?: string
  borderRadius?: string
  boxShadow?: string
  opacity?: number
  fontSize?: string
  fontWeight?: string
  color?: string
  textAlign?: 'left' | 'center' | 'right'
  customClass?: string
}

/** 表单 Schema 节点 */
export interface FormSchemaItem {
  // 基础通用
  type: SchemaType
  /** 组件唯一 ID — 拖拽入画布时生成，格式: 组件Key + 5位随机Hash，永久不变 */
  componentId?: string
  field?: string
  label?: string
  defaultValue?: FormFieldValue
  rules?: SchemaRules
  props?: ComponentProps
  options?: DictItem[]
  hidden?: boolean

  // 条件表达式（表达式引擎求值）
  /** 条件可见 — 表达式求值为 true 时可见 */
  visibleOn?: string
  /** 条件禁用 — 表达式求值为 true 时禁用 */
  disabledOn?: string
  /** 条件必填 — 表达式求值为 true 时必填 */
  requiredOn?: string

  // 联动配置
  linkages?: SchemaLinkage[]

  // 动态数据
  api?: SchemaApiConfig

  // 按钮相关
  text?: string
  buttonType?: '' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  icon?: string
  actions?: SchemaAction[]
  buttons?: SchemaButtonConfig[]

  // 栅格表格布局专用
  span?: number | ResponsiveSpan
  colspan?: number
  rowspan?: number
  width?: string
  height?: string
  align?: 'left' | 'center' | 'right'
  border?: boolean
  hideBorder?: string[]

  // 样式配置 (PropertyPanel 样式配置 tab)
  style?: ComponentStyle

  // 高级配置
  /** 权限角色白配 — 允许访问的角色列表 */
  permissionRoles?: string[]
  /** 只读模式 — 组件在查看模式下是否只读 */
  readonly?: boolean
  /** 自定义 HTML 属性 */
  customAttrs?: Record<string, string>

  // search-list 组件专用
  /** 列表数据请求配置 */
  listApi?: ListApiConfig
  /** 搜索表单字段定义 */
  searchFields?: SearchFieldSchema[]
  /** 表格列定义（search-list / editable-table） */
  columns?: SearchListColumnSchema[] | EditableTableColumn[]
  /** 行操作按钮 */
  rowActions?: SearchListRowAction[]

  // 递归子节点
  children?: FormSchemaItem[]
}

/** 遥测回调接口 — S20 */
export interface FormGridTelemetry {
  /** ErrorBoundary 捕获渲染错误时调用 */
  onRenderError?: (info: { type: string; field?: string; path?: string; error: Error }) => void
  /** API 选项加载失败时调用 */
  onApiError?: (info: { url: string; error: string }) => void
  /** Schema 校验失败时调用 */
  onSchemaError?: (info: { errors: unknown[]; count: number }) => void
}
