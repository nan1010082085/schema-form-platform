/**
 * 规则（联动）系统文档
 *
 * 三大配置之二：规则（联动）
 * 定位：基于数据变化的条件响应引擎
 *
 * 流转：监听源 → 条件求值 → 状态输出 → 渲染应用
 */
import type { RuntimeSystemDoc } from './types'

export const linkageSystem: RuntimeSystemDoc = {
  id: 'linkage',
  name: '规则（联动）系统',
  role: 'config',
  description:
    '联动系统监听表单数据和变量变化，通过条件表达式求值，输出组件渲染状态（visible / disabled / required / options 等）。' +
    '是纯声明式的 — 只描述"什么条件下变成什么状态"，不执行任何副作用。',

  concepts: [
    '监听源 (watchFields) — 字段名列表，任一字段的 formData 值变化时触发求值',
    '条件表达式 (condition) — 支持函数和字符串两种模式',
    '状态输出 — visible / disabled / required / options / set-value / reset-fields',
    '循环依赖检测 — DFS 检测，发现循环时降级为默认状态',
    '响应式传播 — Vue computed 自动追踪依赖，无需手动 watch',
  ],

  configItems: [
    { name: 'type', type: 'LinkageType', description: '联动类型: visible / disabled / required / options / set-value / reset-fields' },
    { name: 'watchFields', type: 'string[]', description: '监听的字段列表' },
    { name: 'condition', type: 'string | function', description: '条件表达式或函数' },
    { name: 'thenOptions', type: 'DictItem[]', description: 'options 联动：条件为真时的静态选项' },
    { name: 'thenApi', type: 'SchemaApiConfig', description: 'options 联动：条件为真时的动态 API' },
    { name: 'thenValue', type: 'FieldValue', description: 'set-value 联动：条件为真时的字面值' },
    { name: 'valueSource', type: 'string', description: 'set-value 联动：条件为真时复制值来源字段' },
    { name: 'targetFields', type: 'string[]', description: 'reset-fields 联动：要重置的目标字段' },
    { name: 'elseValue', type: 'FieldValue', description: '条件为假时的回退值' },
  ],

  relations: [
    { target: 'variables', relation: 'reads', description: '条件表达式读取 variables 和 exposed' },
    { target: 'events', relation: 'reads', description: '事件修改 formData / variables 后，联动自动重算' },
    { target: 'datasource', relation: 'reads', description: 'options 联动可触发 API 数据源加载' },
  ],

  scenarios: [],
}

// ============================================================
// 联动类型详解
// ============================================================

export const linkageTypes = {
  title: '联动类型详解',

  types: [
    {
      type: 'visible',
      label: '显隐联动',
      description: '根据条件控制组件是否可见',
      whenTrue: '组件可见 (state.visible = true)',
      whenFalse: '组件隐藏 (state.visible = false)',
      example: {
        type: 'visible',
        watchFields: ['user_type'],
        condition: 'values.user_type === "admin"',
      },
    },
    {
      type: 'disabled',
      label: '禁用联动',
      description: '根据条件控制组件是否禁用',
      whenTrue: '组件禁用 (state.disabled = true)',
      whenFalse: '组件启用 (state.disabled = false)',
      example: {
        type: 'disabled',
        watchFields: ['status'],
        condition: 'values.status === "approved"',
      },
    },
    {
      type: 'required',
      label: '必填联动',
      description: '根据条件控制字段是否必填',
      whenTrue: '字段必填 (state.required = true)',
      whenFalse: '字段非必填 (state.required = false)',
      example: {
        type: 'required',
        watchFields: ['has_car'],
        condition: 'values.has_car === "yes"',
      },
    },
    {
      type: 'options',
      label: '选项联动',
      description: '根据条件切换下拉选项（静态或动态 API）',
      whenTrue: '使用 thenOptions 或 thenApi',
      whenFalse: '使用 elseValue 或保持原选项',
      example: {
        type: 'options',
        watchFields: ['province'],
        condition: 'values.province === "guangdong"',
        thenOptions: [
          { label: '广州', value: 'guangzhou' },
          { label: '深圳', value: 'shenzhen' },
        ],
      },
    },
    {
      type: 'set-value',
      label: '设值联动',
      description: '根据条件设置目标字段的值',
      whenTrue: '设置 thenValue 或从 valueSource 复制',
      whenFalse: '设置 elseValue',
      example: {
        type: 'set-value',
        watchFields: ['discount_type'],
        condition: 'values.discount_type === "vip"',
        thenValue: 0.8,
        elseValue: 1,
      },
    },
    {
      type: 'reset-fields',
      label: '重置联动',
      description: '根据条件重置指定字段为默认值',
      whenTrue: '重置 targetFields',
      whenFalse: '无操作',
      example: {
        type: 'reset-fields',
        watchFields: ['category'],
        condition: 'values.category !== "custom"',
        targetFields: ['custom_name', 'custom_price'],
      },
    },
  ],
}

// ============================================================
// 联动条件表达式
// ============================================================

export const linkageCondition = {
  title: '联动条件表达式',

  stringMode: `
// 字符串表达式模式
// 可用变量: values (watchFields 的值), variables, exposed
condition: 'values.user_type === "admin"'
condition: 'values.price > 100 && values.quantity > 0'
condition: 'variables.isAdmin === true'
condition: 'exposed.list_1.selectedRows.length > 0'`,

  functionMode: `
// 函数模式 (仅编辑器内使用，不可序列化到 JSON)
condition: (values) => values.user_type === 'admin'
condition: (values) => values.price * values.quantity > 1000`,

  compilation: `
// 编译过程 (useLinkage.ts)
function compileCondition(expression: string) {
  // 1. 安全检查: checkSecurity(expression)
  //    - blocklist: eval, Function, import, require, fetch, axios
  //    - 长度限制: 500 字符
  // 2. 编译为函数:
  const fn = new Function('values', 'variables',
    \`"use strict"; return (\${expression});\`
  )
  // 3. 返回求值函数
  return (values, variables) => {
    try { return Boolean(fn(values, variables ?? {})) }
    catch { return false }  // 求值失败降级为 false
  }
}`,
}

// ============================================================
// 联动状态输出
// ============================================================

export const linkageState = {
  title: '联动状态输出',

  stateInterface: `
interface LinkageState {
  visible: boolean       // 是否可见
  disabled: boolean      // 是否禁用
  required: boolean      // 是否必填
  options?: DictItem[]   // options 联动输出
  optionsApi?: SchemaApiConfig  // options 联动 API
  targetValue?: unknown  // set-value 联动输出
  elseValue?: unknown    // 条件为假时的回退值
  resetFields?: string[] // reset-fields 联动输出
}`,

  application: `
// SchemaNode 中的应用
const renderState = computed(() => {
  const linkageState = linkage.stateMap.value.get(widget.field ?? '')
  const base = linkageState ?? { visible: true, disabled: false, required: false }
  // hidden 静态属性覆盖
  if (widget.hidden) return { ...base, visible: false }
  return base
})

// 模板中使用
<template v-if="renderState.visible">
  <component :disabled="renderState.disabled" />
</template>`,

  multipleLinkages: `
// 同一字段可以有多个联动配置
// 按数组顺序依次求值，后面的状态覆盖前面的
linkages: [
  { type: 'visible', watchFields: ['a'], condition: 'values.a === 1' },
  { type: 'visible', watchFields: ['b'], condition: 'values.b === 2' },
  { type: 'disabled', watchFields: ['c'], condition: 'values.c === 3' },
]
// 最终: visible 由第二个联动决定（后覆盖前），disabled 由第三个决定`,
}

// ============================================================
// 循环依赖检测
// ============================================================

export const cycleDetection = {
  title: '循环依赖检测',

  description: '当 A 依赖 B，B 又依赖 A 时，使用 DFS 检测并降级处理',

  algorithm: `
1. 构建依赖图: field → Set<watchFields>
2. DFS 遍历: 维护 visited 和 inStack 集合
3. 发现循环: inStack 中再次访问到的节点
4. 降级处理: 循环中的字段使用默认状态 { visible: true, disabled: false, required: false }`,

  example: `
// 循环依赖示例
field_A.linkages: [{ watchFields: ['field_B'], condition: '...' }]
field_B.linkages: [{ watchFields: ['field_A'], condition: '...' }]

// 检测结果: field_A 和 field_B 都在 cyclicFields 中
// 降级: 两个字段都使用默认状态，日志输出警告`,
}

export default {
  linkageSystem,
  linkageTypes,
  linkageCondition,
  linkageState,
  cycleDetection,
}
