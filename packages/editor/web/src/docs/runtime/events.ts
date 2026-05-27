/**
 * 事件系统文档
 *
 * 三大配置之一：事件
 * 定位：用户交互驱动的行为执行引擎
 *
 * 流转：触发源 → 条件判断 → 动作链 → 状态变更
 */
import type { RuntimeSystemDoc } from './types'

export const eventSystem: RuntimeSystemDoc = {
  id: 'events',
  name: '事件系统',
  role: 'config',
  description:
    '事件系统处理用户交互（点击、输入、焦点等），通过条件判断后执行动作链。' +
    '是三大配置中唯一具有"写入"能力的系统 — 可以修改变量、修改组件属性、调用 API。',

  concepts: [
    '触发源 (trigger) — 用户交互事件名: click / change / focus / blur / mount / submit / custom',
    '条件判断 (condition) — 可选，表达式求值为 true 时才执行动作链',
    '确认提示 (confirm) — 可选，执行前弹出确认框，用户取消则中断',
    '动作链 (actions) — 顺序执行的动作列表，任一失败则中断',
    '执行上下文 (EventExecutionContext) — 注入运行时能力的接口',
  ],

  configItems: [
    { name: 'trigger', type: 'string', description: '触发事件名: click / change / focus / blur / mount / submit / custom' },
    { name: 'condition', type: 'string', description: '条件表达式（可选），引用 variables / exposed / formData' },
    { name: 'confirm', type: 'string', description: '确认提示文案（可选），弹窗确认后才执行' },
    { name: 'actions', type: 'SchemaEventAction[]', description: '动作链，顺序执行' },
  ],

  relations: [
    { target: 'variables', relation: 'writes', description: 'set-variable 动作修改变量值' },
    { target: 'variables', relation: 'reads', description: '条件表达式读取变量' },
    { target: 'linkage', relation: 'triggers', description: '事件修改变量后，联动自动重算' },
    { target: 'datasource', relation: 'triggers', description: 'trigger-event 可触发数据源刷新' },
  ],

  scenarios: [],
}

// ============================================================
// 事件动作类型完整列表
// ============================================================

export const eventActionTypes = {
  title: '事件动作类型',

  // 当前已实现
  implemented: [
    {
      type: 'show',
      label: '显示组件',
      description: '将目标组件的 hidden 属性设为 false',
      requiredFields: ['target'],
      example: { type: 'show', target: 'panel_123' },
    },
    {
      type: 'hide',
      label: '隐藏组件',
      description: '将目标组件的 hidden 属性设为 true',
      requiredFields: ['target'],
      example: { type: 'hide', target: 'panel_123' },
    },
    {
      type: 'set-value',
      label: '设置值',
      description: '修改目标组件的 defaultValue',
      requiredFields: ['target', 'value'],
      example: { type: 'set-value', target: 'input_name', value: '默认名称' },
    },
    {
      type: 'open-dialog',
      label: '打开弹窗',
      description: '查找弹窗组件并渲染其 children schema',
      requiredFields: ['target'],
      example: { type: 'open-dialog', target: 'dialog_edit' },
    },
    {
      type: 'close-dialog',
      label: '关闭弹窗',
      description: '关闭当前打开的弹窗',
      requiredFields: [],
      example: { type: 'close-dialog' },
    },
    {
      type: 'switch-tab',
      label: '切换标签',
      description: '切换 tabs 容器的 activeKey',
      requiredFields: ['target', 'value'],
      example: { type: 'switch-tab', target: 'tabs_main', value: 'tab_config' },
    },
    {
      type: 'submit',
      label: '提交表单',
      description: '触发表单校验，通过后 emit submit 事件',
      requiredFields: [],
      example: { type: 'submit' },
    },
    {
      type: 'reset',
      label: '重置表单',
      description: '重置所有表单字段为默认值',
      requiredFields: [],
      example: { type: 'reset' },
    },
    {
      type: 'emit',
      label: '发送事件',
      description: '向父组件发送自定义事件',
      requiredFields: [],
      optionalFields: ['value'],
      example: { type: 'emit', value: 'custom-event-name' },
    },
  ],

  // 待实现
  planned: [
    {
      type: 'set-variable',
      label: '设置变量',
      description: '修改用户变量的值，触发响应式传播',
      requiredFields: ['variable', 'value'],
      example: { type: 'set-variable', variable: 'isAdmin', value: true },
    },
    {
      type: 'trigger-event',
      label: '触发组件事件',
      description: '触发目标组件的指定事件（如 refresh / reset-search）',
      requiredFields: ['target', 'event'],
      example: { type: 'trigger-event', target: 'list_1', event: 'refresh' },
    },
    {
      type: 'api',
      label: '调用 API',
      description: '发送 HTTP 请求，支持 formData 作为参数',
      requiredFields: ['apiUrl'],
      optionalFields: ['apiMethod', 'apiParams'],
      example: { type: 'api', apiUrl: '/api/save', apiMethod: 'post', apiParams: 'formData' },
    },
    {
      type: 'navigate',
      label: '路由跳转',
      description: '使用 Vue Router 跳转到指定页面',
      requiredFields: ['navigatePath'],
      optionalFields: ['navigateQuery'],
      example: { type: 'navigate', navigatePath: '/detail', navigateQuery: { id: '123' } },
    },
    {
      type: 'post-message',
      label: '发送 postMessage',
      description: '向父窗口发送消息（微前端/嵌入场景）',
      requiredFields: ['message'],
      example: { type: 'post-message', message: { type: 'form-submit', data: 'formData' } },
    },
    {
      type: 'close-tab',
      label: '关闭页签',
      description: '关闭当前浏览器页签',
      requiredFields: [],
      example: { type: 'close-tab' },
    },
    {
      type: 'copy',
      label: '复制文本',
      description: '复制指定文本到剪贴板',
      requiredFields: ['text'],
      example: { type: 'copy', text: 'formData.code' },
    },
    {
      type: 'refresh',
      label: '刷新组件数据',
      description: '触发目标组件重新加载数据（便捷封装 trigger-event + refresh）',
      requiredFields: ['target'],
      example: { type: 'refresh', target: 'list_1' },
    },
  ],
}

// ============================================================
// 事件执行上下文
// ============================================================

export const eventExecutionContext = {
  title: '事件执行上下文 (EventExecutionContext)',

  description: '事件引擎不直接依赖 Vue 组件或 Store，通过上下文接口注入运行时能力',

  interface: `
interface EventExecutionContext {
  findWidget: (id: string) => Widget | undefined     // 查找组件
  updateWidget: (id: string, patch: Partial<Widget>) => void // 修改组件属性
  openDialog: (target: string) => void               // 打开弹窗
  closeDialog: () => void                            // 关闭弹窗
  submitForm: () => void                             // 提交表单
  resetForm: () => void                              // 重置表单
  getFormData: () => Record<string, unknown>         // 获取表单数据
  emit: (eventName: string, payload?: unknown) => void // 自定义事件
  variables?: Record<string, unknown>                // 变量上下文
  // 待扩展:
  // exposed?: Record<string, Record<string, unknown>> // 组件暴露值
  // setVariable?: (name: string, value: unknown) => void
  // triggerEvent?: (targetId: string, eventName: string) => void
}`,

  twoContexts: `
编辑器模式 (SchemaNode.buildEditorEventContext):
  - findWidget → widgetStore.findWidget
  - updateWidget → widgetStore.updateWidget (直接修改 Store)
  - openDialog → editorStore.openDialogEditor
  - emit → logger.event (仅打印)

运行时模式 (WidgetRenderer/index.vue):
  - findWidget → 递归遍历 props.schema 树
  - updateWidget → Object.assign(widget, patch) (修改 reactive 对象)
  - openDialog → 触发 el-dialog 渲染
  - emit → 向父组件 emit('action', ...)`,
}

// ============================================================
// 事件配置示例
// ============================================================

export const eventExamples = {
  title: '事件配置示例',

  examples: [
    {
      name: '按钮点击显示面板',
      description: '最简单的显隐控制',
      config: {
        events: [
          {
            trigger: 'click',
            actions: [{ type: 'show', target: 'panel_detail' }],
          },
        ],
      },
    },
    {
      name: '条件触发表格刷新',
      description: '仅在表单有效时刷新',
      config: {
        events: [
          {
            trigger: 'click',
            condition: 'formData.name && formData.name.length > 0',
            actions: [
              { type: 'trigger-event', target: 'list_1', event: 'refresh' },
            ],
          },
        ],
      },
    },
    {
      name: '确认后保存并刷新',
      description: '确认提示 → API 保存 → 刷新表格',
      config: {
        events: [
          {
            trigger: 'click',
            confirm: '确定保存吗？',
            actions: [
              { type: 'api', apiUrl: '/api/save', apiMethod: 'post', apiParams: 'formData' },
              { type: 'trigger-event', target: 'list_1', event: 'refresh' },
              { type: 'close-dialog' },
            ],
          },
        ],
      },
    },
    {
      name: '设置变量并联动',
      description: '修改变量，触发其他组件联动',
      config: {
        events: [
          {
            trigger: 'click',
            actions: [
              { type: 'set-variable', variable: 'isAdmin', value: true },
              { type: 'show', target: 'admin_panel' },
            ],
          },
        ],
      },
    },
  ],
}

export default {
  eventSystem,
  eventActionTypes,
  eventExecutionContext,
  eventExamples,
}
