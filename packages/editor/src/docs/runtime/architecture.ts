/**
 * 运行时架构总览
 *
 * 核心要素：
 *   Widgets（部件） — 配置与渲染的基本单元
 *   Store（数据总成） — 全局状态管理
 *   三大配置：事件、规则（联动）、数据源
 *   一个核心支撑：变量系统
 */
import type { ScenarioDoc } from './types'

// ============================================================
// 架构总览
// ============================================================

export const architectureOverview = {
  title: '低代码可视化配置 — 运行时架构',

  /**
   * 核心要素关系图
   *
   * ┌─────────────────────────────────────────────────────────────────┐
   * │                        画布 (Board)                             │
   * │  ┌─────────────────────────────────────────────────────────┐   │
   * │  │  画布变量 (BoardVariables)                                │   │
   * │  │  画布事件 (BoardEvents)                                   │   │
   * │  └─────────────────────────────────────────────────────────┘   │
   * │                                                                 │
   * │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
   * │  │  Widget A     │  │  Widget B     │  │  Widget C     │         │
   * │  │  ┌─────────┐  │  │  ┌─────────┐  │  │  ┌─────────┐  │         │
   * │  │  │ variables│  │  │  │ variables│  │  │  │ variables│  │         │
   * │  │  │ events   │  │  │  │ events   │  │  │  │ events   │  │         │
   * │  │  │ linkages │  │  │  │ linkages │  │  │  │ linkages │  │         │
   * │  │  │ api      │  │  │  │ api      │  │  │  │ api      │  │         │
   * │  │  └─────────┘  │  │  └─────────┘  │  │  └─────────┘  │         │
   * │  └──────────────┘  └──────────────┘  └──────────────┘         │
   * └─────────────────────────────────────────────────────────────────┘
   *
   * ┌─────────────────────────────────────────────────────────────────┐
   * │                      Store (数据总成)                           │
   * │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐        │
   * │  │ boardStore     │ │ widgetStore   │ │ editorStore   │        │
   * │  │ · variables    │ │ · widgets     │ │ · selection   │        │
   * │  │ · events       │ │ · findWidget  │ │ · clipboard   │        │
   * │  │ · canvas       │ │ · updateWidget│ │ · undo/redo   │        │
   * │  └───────────────┘ └───────────────┘ └───────────────┘        │
   * └─────────────────────────────────────────────────────────────────┘
   *
   * ┌─────────────────────────────────────────────────────────────────┐
   * │                    运行时执行引擎                                │
   * │                                                                 │
   * │   RuntimeContext (统一出口)                                      │
   * │     ├── variables: Record<string, unknown>     ← 变量系统        │
   * │     ├── exposed: Record<widgetId, values>      ← 组件暴露值      │
   * │     ├── formData: Record<string,FieldValue>    ← 表单数据        │
   * │     ├── $user / $request / $global             ← 上下文          │
   * │     │                                                           │
   * │     ├── 联动引擎 (useLinkage)                  ← 规则配置        │
   * │     │   condition → variables / exposed / formData               │
   * │     │   output → visible / disabled / required / options         │
   * │     │                                                           │
   * │     ├── 事件引擎 (eventEngine)                 ← 事件配置        │
   * │     │   trigger → condition → actions                            │
   * │     │   actions → set-variable / show / hide / api / ...         │
   * │     │                                                           │
   * │     └── 数据源引擎 (useDynamicOptions)          ← 数据源配置      │
   * │         apiConfig → request → normalize → options               │
   * └─────────────────────────────────────────────────────────────────┘
   */
  coreElementsDiagram: `
┌─────────────────────────────────────────────────────────────┐
│                     核心要素关系                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌──────────────┐                          │
│                    │   Widgets    │                          │
│                    │   (部件)      │                          │
│                    └──────┬───────┘                          │
│                           │ 配置                             │
│            ┌──────────────┼──────────────┐                   │
│            ▼              ▼              ▼                   │
│     ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│     │   事件      │ │   规则      │ │  数据源     │           │
│     │  (Events)  │ │ (Linkage)  │ │(DataSource)│           │
│     └─────┬──────┘ └─────┬──────┘ └─────┬──────┘           │
│           │              │              │                    │
│           └──────────────┼──────────────┘                    │
│                          ▼                                   │
│                 ┌────────────────┐                           │
│                 │   变量系统      │                           │
│                 │  (Variables)   │                           │
│                 │  核心支撑       │                           │
│                 └───────┬────────┘                           │
│                         │                                    │
│                         ▼                                    │
│                 ┌────────────────┐                           │
│                 │  Store 总成     │                           │
│                 │  (数据管理)     │                           │
│                 └────────────────┘                           │
│                                                              │
│  Widget = 配置单元，承载四大配置                               │
│  Store = 状态管理，统一数据出口                                │
│  变量系统 = 核心支撑，连接三大配置                              │
└─────────────────────────────────────────────────────────────┘`,

  /**
   * 变量系统 — 核心支撑定位
   *
   * 变量是三大配置的公共语言：
   * - 事件通过 set-variable 写入变量
   * - 规则（联动）通过 condition 读取变量
   * - 数据源通过条件表达式决定是否加载
   *
   * 两种变量：
   * - 用户变量 (StateVars)：用户自定义，运行时可读写
   * - 组件暴露值 (ExposedValues)：组件声明，运行时只读
   */
  variableSystemDiagram: `
┌─────────────────────────────────────────────────────────────────┐
│                       变量系统架构                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐       ┌─────────────────────┐          │
│  │ 用户变量 (StateVars) │       │ 组件暴露值           │          │
│  │ 用户在编辑器定义     │       │ (ExposedValues)     │          │
│  ├─────────────────────┤       ├─────────────────────┤          │
│  │ 画布级 (boardStore)  │       │ 组件 config.ts 声明 │          │
│  │   isAdmin = false   │       │   selectedRows      │          │
│  │   env = 'prod'      │       │   loading           │          │
│  │                     │       │   pagination        │          │
│  │ 组件级 (widget)      │       │                     │          │
│  │   pageSize = 10     │       │ 运行时组件内部更新   │          │
│  └──────────┬──────────┘       └──────────┬──────────┘          │
│             │                              │                     │
│             ▼                              ▼                     │
│  ┌──────────────────────────────────────────────────┐           │
│  │            RuntimeContext (统一出口)               │           │
│  │                                                   │           │
│  │  variables: { isAdmin: false, env: 'prod' }       │           │
│  │  exposed: {                                       │           │
│  │    'list_123': { selectedRows: [], loading: false }│           │
│  │  }                                                │           │
│  └──────────────────────┬───────────────────────────┘           │
│                         │                                        │
│              ┌──────────┼──────────┐                             │
│              ▼          ▼          ▼                             │
│         ┌────────┐ ┌────────┐ ┌────────┐                        │
│         │ 联动    │ │ 事件    │ │ 数据源  │                        │
│         │ 读取    │ │ 读写    │ │ 读取    │                        │
│         └────────┘ └────────┘ └────────┘                        │
│                                                                  │
│  引用语法:                                                       │
│    variables.isAdmin          → 用户变量                         │
│    exposed.list_123.loading   → 组件暴露值                       │
│    formData.name              → 表单数据                         │
│    $user.roles                → 用户上下文                       │
└─────────────────────────────────────────────────────────────────┘`,

  /**
   * 事件系统流转
   *
   * 触发 → 条件 → 动作链 → 状态变更
   */
  eventSystemDiagram: `
┌─────────────────────────────────────────────────────────────────┐
│                       事件系统流转                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  触发源   │───→│  条件判断 │───→│  动作链   │───→│ 状态变更  │  │
│  │ (trigger) │    │(condition)│    │ (actions) │    │  (effect) │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
│  触发源:                                                         │
│    click / change / focus / blur / mount / submit / custom       │
│                                                                  │
│  条件判断 (可选):                                                 │
│    expression → new Function('formData','variables','exposed')   │
│    例: "formData.role === 'admin' && variables.isLoggedIn"       │
│                                                                  │
│  动作链 (顺序执行):                                               │
│    ┌─────────────┬─────────────────────────────────────────┐    │
│    │ 动作类型     │ 效果                                    │    │
│    ├─────────────┼─────────────────────────────────────────┤    │
│    │ show        │ target.hidden = false                    │    │
│    │ hide        │ target.hidden = true                     │    │
│    │ set-value   │ target.defaultValue = value              │    │
│    │ set-variable│ variables[name] = value                  │    │
│    │ trigger-event│ 触发目标组件的指定事件                    │    │
│    │ open-dialog │ 打开弹窗渲染 children                    │    │
│    │ close-dialog│ 关闭当前弹窗                             │    │
│    │ submit      │ 提交表单 (校验 + emit)                   │    │
│    │ reset       │ 重置表单字段                             │    │
│    │ api         │ 调用后端 API                             │    │
│    │ navigate    │ 路由跳转                                 │    │
│    │ post-message│ 向父窗口发送消息                         │    │
│    │ close-tab   │ 关闭浏览器页签                           │    │
│    │ copy        │ 复制文本到剪贴板                          │    │
│    │ emit        │ 向父组件发送自定义事件                    │    │
│    └─────────────┴─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘`,

  /**
   * 规则（联动）系统流转
   *
   * 监听 → 条件 → 状态输出 → 渲染应用
   */
  linkageSystemDiagram: `
┌─────────────────────────────────────────────────────────────────┐
│                     规则（联动）系统流转                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  监听源   │───→│  条件求值 │───→│ 状态输出  │───→│ 渲染应用  │  │
│  │(watchFields)   │(condition)│    │ (state)   │    │ (render)  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
│  监听源:                                                         │
│    watchFields: ['field_a', 'field_b']                           │
│    当 formData[field] 变化时 → 触发重新求值                       │
│                                                                  │
│  条件求值:                                                       │
│    支持函数: (values) => values.type === 'advanced'              │
│    支持表达式: "values.type === 'advanced'"                      │
│    可引用: values / variables / exposed                          │
│                                                                  │
│  状态输出:                                                       │
│    ┌──────────────┬────────────────────────────────────────┐    │
│    │ 联动类型      │ 输出                                    │    │
│    ├──────────────┼────────────────────────────────────────┤    │
│    │ visible      │ state.visible = true/false              │    │
│    │ disabled     │ state.disabled = true/false             │    │
│    │ required     │ state.required = true/false             │    │
│    │ options      │ state.options = thenOptions             │    │
│    │ set-value    │ state.targetValue = thenValue           │    │
│    │ reset-fields │ state.resetFields = targetFields        │    │
│    └──────────────┴────────────────────────────────────────┘    │
│                                                                  │
│  渲染应用:                                                       │
│    SchemaNode 读取 stateMap → 控制组件可见/禁用/必填/选项         │
└─────────────────────────────────────────────────────────────────┘`,

  /**
   * 数据源系统流转
   *
   * 配置 → 请求 → 解析 → 缓存 → 应用
   */
  dataSourceDiagram: `
┌─────────────────────────────────────────────────────────────────┐
│                      数据源系统流转                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  API 配置 │───→│  请求队列 │───→│ 数据解析  │───→│  应用     │  │
│  │(apiConfig)│    │ (queue)  │    │(normalize)│    │ (options) │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
│  API 配置:                                                       │
│    {                                                             │
│      url: '/api/options',                                        │
│      method: 'get',                                              │
│      params: { type: 'city' },                                   │
│      dataPath: 'result.list',     // 响应数据路径                 │
│      labelKey: 'name',            // 选项标签字段                 │
│      valueKey: 'code',            // 选项值字段                   │
│      ttl: 60000,                  // 缓存有效期                   │
│      cacheLevel: 'memory',        // 缓存策略                     │
│      enableRetry: true,           // 失败重试                     │
│      dictCode: 'CITY_LIST'        // 优先从 dictMap 查找          │
│    }                                                             │
│                                                                  │
│  请求队列:                                                       │
│    并发控制 + 去重 + 缓存命中检查                                 │
│                                                                  │
│  数据解析:                                                       │
│    response → dataPath 提取 → labelKey/valueKey 映射 → DictItem[]│
│                                                                  │
│  缓存策略:                                                       │
│    memory (默认) / indexeddb / both                               │
│    TTL 过期自动失效                                               │
└─────────────────────────────────────────────────────────────────┘`,
}

// ============================================================
// 场景示例
// ============================================================

export const scenarios: ScenarioDoc[] = [
  {
    name: '场景1: 点击按钮显示/隐藏组件',
    description: '用户点击按钮，根据条件显示或隐藏某个面板组件',
    systems: ['events'],
    steps: [
      '1. 拖入按钮组件 (id: btn_toggle)',
      '2. 拖入面板组件 (id: panel_detail)',
      '3. 配置按钮事件: trigger=click, action=show, target=panel_detail',
      '4. 可选: 添加条件表达式，仅在特定条件下执行',
    ],
    flow: {
      name: '按钮显隐',
      description: '点击按钮 → 条件判断 → 显示/隐藏目标组件',
      nodes: [
        { id: 'click', label: '用户点击按钮', type: 'trigger' },
        { id: 'condition', label: '条件判断', type: 'condition' },
        { id: 'show', label: 'show: target.hidden=false', type: 'action' },
        { id: 'hide', label: 'hide: target.hidden=true', type: 'action' },
        { id: 'render', label: '组件重新渲染', type: 'output' },
      ],
      edges: [
        { from: 'click', to: 'condition' },
        { from: 'condition', to: 'show', label: '条件为真' },
        { from: 'condition', to: 'hide', label: '条件为假' },
        { from: 'show', to: 'render' },
        { from: 'hide', to: 'render' },
      ],
      textDiagram: `
用户点击按钮
     │
     ▼
条件判断 (condition)
     │
     ├── 真 ──→ show: target.hidden = false ──→ 组件显示
     │
     └── 假 ──→ 无动作 (或 hide: target.hidden = true)`,
    },
  },
  {
    name: '场景2: 点击按钮打开弹窗',
    description: '用户点击按钮，打开一个配置了子 schema 的弹窗组件',
    systems: ['events'],
    steps: [
      '1. 拖入弹窗组件 (id: dialog_edit)，配置子表单',
      '2. 拖入按钮组件 (id: btn_open)',
      '3. 配置按钮事件: trigger=click, action=open-dialog, target=dialog_edit',
    ],
    flow: {
      name: '打开弹窗',
      description: '点击按钮 → 查找弹窗组件 → 渲染弹窗内容',
      nodes: [
        { id: 'click', label: '用户点击按钮', type: 'trigger' },
        { id: 'find', label: 'findWidget(dialog_id)', type: 'condition' },
        { id: 'open', label: 'openDialog({ schema, title })', type: 'action' },
        { id: 'render', label: 't-dialog 渲染', type: 'output' },
      ],
      edges: [
        { from: 'click', to: 'find' },
        { from: 'find', to: 'open' },
        { from: 'open', to: 'render' },
      ],
      textDiagram: `
用户点击按钮
     │
     ▼
findWidget('dialog_edit')
     │
     ▼
openDialog({ title, width, schema: dialog.children })
     │
     ▼
t-dialog 渲染弹窗内容`,
    },
  },
  {
    name: '场景3: 弹窗确认 → 保存数据 → 刷新表格',
    description: '弹窗内表单提交，调用 API 保存后刷新外部表格数据',
    systems: ['events', 'datasource'],
    steps: [
      '1. 弹窗内按钮配置动作链:',
      '   action[0]: { type: "api", apiUrl: "/api/save", apiParams: "formData" }',
      '   action[1]: { type: "trigger-event", target: "list_1", event: "refresh" }',
      '2. search-list 组件实现 onTriggerEvent("refresh") → loadData()',
    ],
    flow: {
      name: '保存并刷新',
      description: '确认按钮 → API 保存 → 触发表格刷新 → 表格重新请求数据',
      nodes: [
        { id: 'click', label: '点击确认按钮', type: 'trigger' },
        { id: 'validate', label: '表单校验', type: 'condition' },
        { id: 'api', label: 'POST /api/save (formData)', type: 'action' },
        { id: 'trigger', label: 'trigger-event(list, refresh)', type: 'action' },
        { id: 'load', label: 'search-list.loadData()', type: 'action' },
        { id: 'done', label: '表格数据更新', type: 'output' },
      ],
      edges: [
        { from: 'click', to: 'validate' },
        { from: 'validate', to: 'api', label: '校验通过' },
        { from: 'api', to: 'trigger', label: '保存成功' },
        { from: 'trigger', to: 'load' },
        { from: 'load', to: 'done' },
      ],
      textDiagram: `
点击确认按钮
     │
     ▼
表单校验 (validate)
     │
     ├── 失败 ──→ 中断，显示错误
     │
     └── 通过 ──→ POST /api/save (formData)
                       │
                       ├── 失败 ──→ MessagePlugin.error
                       │
                       └── 成功 ──→ trigger-event('list_1', 'refresh')
                                         │
                                         ▼
                                  search-list.loadData()
                                         │
                                         ▼
                                  表格数据更新`,
    },
  },
  {
    name: '场景4: 点击提交发送 postMessage',
    description: '嵌入式场景下，表单提交后向父窗口发送消息',
    systems: ['events'],
    steps: [
      '1. 按钮配置动作链:',
      '   action[0]: { type: "submit" }  // 校验 + 收集数据',
      '   action[1]: { type: "post-message", message: { type: "form-submit", data: "formData" } }',
    ],
    flow: {
      name: '提交并通知父窗口',
      description: '提交按钮 → 校验 → postMessage → 父窗口接收',
      nodes: [
        { id: 'click', label: '点击提交按钮', type: 'trigger' },
        { id: 'validate', label: '表单校验', type: 'condition' },
        { id: 'submit', label: '收集 formData', type: 'action' },
        { id: 'post', label: 'postMessage(formData)', type: 'action' },
        { id: 'parent', label: '父窗口接收消息', type: 'output' },
      ],
      edges: [
        { from: 'click', to: 'validate' },
        { from: 'validate', to: 'submit', label: '校验通过' },
        { from: 'submit', to: 'post' },
        { from: 'post', to: 'parent' },
      ],
      textDiagram: `
点击提交按钮
     │
     ▼
表单校验 (validate)
     │
     └── 通过 ──→ collectFormData()
                       │
                       ▼
                window.parent.postMessage({
                  type: 'form-submit',
                  data: formData
                }, '*')
                       │
                       ▼
                父窗口 message 事件监听`,
    },
  },
  {
    name: '场景5: 变量驱动的多级联动',
    description: '用户变量 + 事件 + 联动组合：设置变量后，多个组件响应变化',
    systems: ['variables', 'events', 'linkage'],
    steps: [
      '1. 画布定义变量: isAdmin = false',
      '2. 按钮 A 事件: click → set-variable(isAdmin, true) + show(admin_panel)',
      '3. 按钮 B 联动: visible ← variables.isAdmin === true',
      '4. 表单字段联动: disabled ← variables.isAdmin === false',
    ],
    flow: {
      name: '变量驱动联动',
      description: '事件修改变量 → 变量变化触发多个联动 → UI 批量更新',
      nodes: [
        { id: 'click', label: '点击按钮 A', type: 'trigger' },
        { id: 'setvar', label: 'set-variable(isAdmin=true)', type: 'action' },
        { id: 'varchange', label: 'variables.isAdmin 变化', type: 'state' },
        { id: 'linkage1', label: '按钮 B visible 联动', type: 'condition' },
        { id: 'linkage2', label: '字段 disabled 联动', type: 'condition' },
        { id: 'show', label: '按钮 B 显示', type: 'output' },
        { id: 'enable', label: '字段启用', type: 'output' },
      ],
      edges: [
        { from: 'click', to: 'setvar' },
        { from: 'setvar', to: 'varchange' },
        { from: 'varchange', to: 'linkage1' },
        { from: 'varchange', to: 'linkage2' },
        { from: 'linkage1', to: 'show', label: '条件为真' },
        { from: 'linkage2', to: 'enable', label: '条件为假' },
      ],
      textDiagram: `
点击按钮 A
     │
     ▼
set-variable('isAdmin', true)
     │
     ▼
variablesContext 响应式更新
     │
     ├──→ useLinkage 重算 ──→ 按钮 B visible=true ──→ 显示
     │
     └──→ useLinkage 重算 ──→ 字段 disabled=false ──→ 启用
`,
    },
  },
  {
    name: '场景6: 组件暴露值驱动联动',
    description: '表格选中行变化 → 按钮显隐联动',
    systems: ['linkage'],
    steps: [
      '1. search-list 组件声明 exposedValues: selectedRows, loading',
      '2. 删除按钮配置联动: condition = "exposed.list_1.selectedRows.length > 0"',
      '3. 用户勾选表格行 → search-list 内部更新 selectedRows',
      '4. useLinkage 检测到 exposed 变化 → 删除按钮显示',
    ],
    flow: {
      name: '暴露值联动',
      description: '组件内部状态变化 → 暴露值更新 → 联动条件重算 → UI 更新',
      nodes: [
        { id: 'select', label: '用户勾选表格行', type: 'trigger' },
        { id: 'internal', label: 'search-list.selectedRows 更新', type: 'state' },
        { id: 'exposed', label: 'exposed.list_1.selectedRows 更新', type: 'state' },
        { id: 'condition', label: 'selectedRows.length > 0', type: 'condition' },
        { id: 'show', label: '删除按钮显示', type: 'output' },
      ],
      edges: [
        { from: 'select', to: 'internal' },
        { from: 'internal', to: 'exposed' },
        { from: 'exposed', to: 'condition' },
        { from: 'condition', to: 'show', label: '条件为真' },
      ],
      textDiagram: `
用户勾选表格行
     │
     ▼
search-list 内部: selectedRows = [row1, row2]
     │
     ▼
exposed.list_1.selectedRows 响应式更新
     │
     ▼
useLinkage 重算条件:
  "exposed.list_1.selectedRows.length > 0" → true
     │
     ▼
删除按钮 visible = true → 显示`,
    },
  },
]

export default {
  architectureOverview,
  scenarios,
}
