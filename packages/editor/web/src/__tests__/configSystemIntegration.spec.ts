/**
 * 三大配置系统 + 变量系统 交互集成测试
 *
 * 覆盖：
 * 1. 事件 ↔ 变量：set-variable / getVariable / 变量条件判断
 * 2. 联动 ↔ 变量：variables / exposed 引用、reset-fields
 * 3. 数据源 ↔ 联动：options 联动、API 联动
 * 4. 事件 → 弹窗 → 数据源 完整链路
 * 5. 三系统联合：审批流程、动态表单、表格操作
 * 6. 边界场景：空变量、undefined、循环引用防护
 */
import { describe, it, expect, vi } from 'vitest'
import { reactive } from 'vue'
import { executeEventAction, triggerWidgetEvent, type EventExecutionContext } from '@/engine/eventEngine'
import { useLinkage } from '@/composables/useLinkage'
import type { PartialWidget, Widget, SchemaEventAction } from '@/widgets/base/types'
import type { FormData } from '@/components/WidgetRenderer/types'

vi.mock('@/composables/useLogger', () => ({
  useLogger: vi.fn(() => ({
    warn: vi.fn(),
    info: vi.fn(),
    rule: vi.fn(),
    event: vi.fn(),
    debug: vi.fn(),
    api: vi.fn(),
  })),
}))

// ---- Helpers ----

function createCtx(overrides: Partial<EventExecutionContext> = {}): EventExecutionContext {
  return {
    findWidget: vi.fn(),
    updateWidget: vi.fn(),
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    submitForm: vi.fn(),
    resetForm: vi.fn(),
    getFormData: vi.fn().mockReturnValue({}),
    emit: vi.fn(),
    ...overrides,
  }
}

function createWidget(overrides: Partial<Widget> = {}): Widget {
  return {
    id: 'w1',
    type: 'button',
    label: '按钮',
    ...overrides,
  } as Widget
}

describe('三大配置系统 + 变量系统 交互集成', () => {

  // =====================================================
  // 1. 事件 ↔ 变量
  // =====================================================

  describe('事件 ↔ 变量', () => {
    it('set-variable 设置变量值', () => {
      const variables = reactive<Record<string, unknown>>({ count: 0 })
      const ctx = createCtx({
        variables,
        setVariable: (name, value) => { variables[name] = value },
      })

      executeEventAction({ type: 'set-variable', variable: 'count', value: 42 }, ctx)
      expect(variables.count).toBe(42)
    })

    it('set-variable 覆盖已有变量', () => {
      const variables = reactive<Record<string, unknown>>({ status: 'idle' })
      const ctx = createCtx({
        variables,
        setVariable: (name, value) => { variables[name] = value },
      })

      executeEventAction({ type: 'set-variable', variable: 'status', value: 'running' }, ctx)
      expect(variables.status).toBe('running')
    })

    it('set-variable 创建新变量', () => {
      const variables = reactive<Record<string, unknown>>({})
      const ctx = createCtx({
        variables,
        setVariable: (name, value) => { variables[name] = value },
      })

      executeEventAction({ type: 'set-variable', variable: 'newVar', value: 'hello' }, ctx)
      expect(variables.newVar).toBe('hello')
    })

    it('set-variable 支持不同值类型', () => {
      const variables = reactive<Record<string, unknown>>({})
      const ctx = createCtx({
        variables,
        setVariable: (name, value) => { variables[name] = value },
      })

      executeEventAction({ type: 'set-variable', variable: 'str', value: 'text' }, ctx)
      executeEventAction({ type: 'set-variable', variable: 'num', value: 123 }, ctx)
      executeEventAction({ type: 'set-variable', variable: 'bool', value: true }, ctx)
      executeEventAction({ type: 'set-variable', variable: 'arr', value: [1, 2, 3] }, ctx)
      executeEventAction({ type: 'set-variable', variable: 'obj', value: { a: 1 } }, ctx)
      executeEventAction({ type: 'set-variable', variable: 'nil', value: null }, ctx)

      expect(variables.str).toBe('text')
      expect(variables.num).toBe(123)
      expect(variables.bool).toBe(true)
      expect(variables.arr).toEqual([1, 2, 3])
      expect(variables.obj).toEqual({ a: 1 })
      expect(variables.nil).toBeNull()
    })

    it('事件链中多个 set-variable 累积执行', () => {
      const variables = reactive<Record<string, unknown>>({ step: 0, done: false })
      const ctx = createCtx({
        variables,
        setVariable: (name, value) => { variables[name] = value },
      })

      const actions: SchemaEventAction[] = [
        { type: 'set-variable', variable: 'step', value: 1 },
        { type: 'set-variable', variable: 'step', value: 2 },
        { type: 'set-variable', variable: 'step', value: 3 },
        { type: 'set-variable', variable: 'done', value: true },
      ]

      for (const action of actions) executeEventAction(action, ctx)

      expect(variables.step).toBe(3)
      expect(variables.done).toBe(true)
    })

    it('set-variable 无 setVariable 回调时静默跳过', () => {
      const variables = reactive<Record<string, unknown>>({ x: 1 })
      const ctx = createCtx({ variables }) // 无 setVariable

      executeEventAction({ type: 'set-variable', variable: 'x', value: 99 }, ctx)
      expect(variables.x).toBe(1) // 未改变
    })

    it('set-variable 无 variable 名称时跳过', () => {
      const variables = reactive<Record<string, unknown>>({})
      const ctx = createCtx({
        variables,
        setVariable: (name, value) => { variables[name] = value },
      })

      executeEventAction({ type: 'set-variable', variable: '', value: 'test' }, ctx)
      expect(Object.keys(variables)).toHaveLength(0)
    })

    it('事件条件中引用变量', async () => {
      const variables = reactive<Record<string, unknown>>({ enabled: true })
      const submitForm = vi.fn()
      const ctx = createCtx({
        variables,
        submitForm,
        getFormData: vi.fn().mockReturnValue({}),
      })

      const widget = createWidget({
        events: [{
          trigger: 'click',
          condition: 'variables.enabled === true',
          actions: [{ type: 'submit' }],
        }],
      })

      await triggerWidgetEvent(widget, 'click', ctx)
      expect(submitForm).toHaveBeenCalled()
    })

    it('事件条件变量为 false 时跳过', async () => {
      const variables = reactive<Record<string, unknown>>({ enabled: false })
      const submitForm = vi.fn()
      const ctx = createCtx({
        variables,
        submitForm,
        getFormData: vi.fn().mockReturnValue({}),
      })

      const widget = createWidget({
        events: [{
          trigger: 'click',
          condition: 'variables.enabled === true',
          actions: [{ type: 'submit' }],
        }],
      })

      await triggerWidgetEvent(widget, 'click', ctx)
      expect(submitForm).not.toHaveBeenCalled()
    })

    it('事件条件中混合 formData 和变量', async () => {
      const variables: Record<string, unknown> = reactive({ role: 'admin' })
      const submitForm = vi.fn()
      const ctx = createCtx({
        variables,
        submitForm,
        getFormData: vi.fn().mockReturnValue({ status: 'active' }),
      })

      const widget = createWidget({
        events: [{
          trigger: 'click',
          condition: 'values.status === "active" && variables.role === "admin"',
          actions: [{ type: 'submit' }],
        }],
      })

      await triggerWidgetEvent(widget, 'click', ctx)
      expect(submitForm).toHaveBeenCalled()
    })

    it('trigger-event 触发目标组件事件', () => {
      const triggerEvent = vi.fn()
      const ctx = createCtx({ triggerEvent })

      executeEventAction({ type: 'trigger-event', target: 'table1', event: 'refresh' }, ctx)
      expect(triggerEvent).toHaveBeenCalledWith('table1', 'refresh')
    })

    it('trigger-event 无 target 时跳过', () => {
      const triggerEvent = vi.fn()
      const ctx = createCtx({ triggerEvent })

      executeEventAction({ type: 'trigger-event', target: '', event: 'refresh' }, ctx)
      expect(triggerEvent).not.toHaveBeenCalled()
    })

    it('trigger-event 无 event 时跳过', () => {
      const triggerEvent = vi.fn()
      const ctx = createCtx({ triggerEvent })

      executeEventAction({ type: 'trigger-event', target: 'table1', event: '' }, ctx)
      expect(triggerEvent).not.toHaveBeenCalled()
    })
  })

  // =====================================================
  // 2. 联动 ↔ 变量
  // =====================================================

  describe('联动 ↔ 变量', () => {
    it('联动条件引用 variables', () => {
      const variables = reactive<Record<string, unknown>>({ showField: false })
      const schema: PartialWidget[] = [{
        type: 'input',
        field: 'extra',
        label: '额外字段',
        linkages: [{
          type: 'visible',
          watchFields: ['mode'],
          condition: 'variables.showField === true',
        }],
      }]

      const formData = reactive<FormData>({ mode: 'edit' })
      const { stateMap } = useLinkage(schema, formData, variables)

      expect(stateMap.value.get('extra')!.visible).toBe(false)

      variables.showField = true
      expect(stateMap.value.get('extra')!.visible).toBe(true)
    })

    it('联动条件引用 exposed', () => {
      const exposed = reactive<Record<string, Record<string, unknown>>>({
        table1: { selectedRows: [{ id: 1 }] },
      })

      const schema: PartialWidget[] = [{
        type: 'button',
        field: 'editBtn',
        label: '编辑',
        linkages: [{
          type: 'disabled',
          watchFields: ['mode'],
          condition: 'exposed.table1.selectedRows.length === 0',
        }],
      }]

      const formData = reactive<FormData>({ mode: 'edit' })
      const { stateMap } = useLinkage(schema, formData, undefined, exposed)

      expect(stateMap.value.get('editBtn')!.disabled).toBe(false)

      exposed.table1.selectedRows = []
      expect(stateMap.value.get('editBtn')!.disabled).toBe(true)
    })

    it('联动条件混合 variables + exposed + formData', () => {
      const variables = reactive<Record<string, unknown>>({ minCount: 5 })
      const exposed = reactive<Record<string, Record<string, unknown>>>({
        counter: { value: 3 },
      })

      const schema: PartialWidget[] = [{
        type: 'button',
        field: 'actionBtn',
        label: '执行',
        linkages: [{
          type: 'disabled',
          watchFields: ['status'],
          condition: 'values.status !== "ready" || exposed.counter.value < variables.minCount',
        }],
      }]

      const formData = reactive<FormData>({ status: 'ready' })
      const { stateMap } = useLinkage(schema, formData, variables, exposed)

      // status=ready, counter=3 < minCount=5 → disabled
      expect(stateMap.value.get('actionBtn')!.disabled).toBe(true)

      // counter 达到阈值
      exposed.counter.value = 6
      expect(stateMap.value.get('actionBtn')!.disabled).toBe(false)

      // status 变化
      formData.status = 'pending'
      expect(stateMap.value.get('actionBtn')!.disabled).toBe(true)
    })

    it('reset-fields 联动产生 resetFields 状态', () => {
      const schema: PartialWidget[] = [
        { type: 'select', field: 'type', label: '类型' },
        {
          type: 'input',
          field: 'name',
          label: '名称',
          defaultValue: '默认名称',
          linkages: [{
            type: 'reset-fields',
            watchFields: ['type'],
            condition: 'values.type !== ""',
            targetFields: ['name'],
          }],
        },
      ]

      const formData = reactive<FormData>({ type: '', name: '自定义名称' })
      const { stateMap } = useLinkage(schema, formData)

      // 条件不满足时无 resetFields
      expect(stateMap.value.get('name')!.resetFields).toBeUndefined()

      // 条件满足后产生 resetFields 列表
      formData.type = 'A'
      expect(stateMap.value.get('name')!.resetFields).toEqual(['name'])
    })

    it('options 联动根据条件切换选项', () => {
      const schema: PartialWidget[] = [
        { type: 'select', field: 'category', label: '分类' },
        {
          type: 'select',
          field: 'item',
          label: '项目',
          linkages: [
            {
              type: 'options',
              watchFields: ['category'],
              condition: 'values.category === "fruit"',
              thenOptions: [
                { label: '苹果', value: 'apple' },
                { label: '香蕉', value: 'banana' },
              ],
            },
            {
              type: 'options',
              watchFields: ['category'],
              condition: 'values.category === "drink"',
              thenOptions: [
                { label: '咖啡', value: 'coffee' },
                { label: '茶', value: 'tea' },
              ],
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ category: '', item: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('item')!.options).toBeUndefined()

      formData.category = 'fruit'
      expect(stateMap.value.get('item')!.options).toEqual([
        { label: '苹果', value: 'apple' },
        { label: '香蕉', value: 'banana' },
      ])

      formData.category = 'drink'
      expect(stateMap.value.get('item')!.options).toEqual([
        { label: '咖啡', value: 'coffee' },
        { label: '茶', value: 'tea' },
      ])
    })

    it('多个联动规则按优先级生效', () => {
      const schema: PartialWidget[] = [{
        type: 'input',
        field: 'name',
        label: '名称',
        linkages: [
          { type: 'visible', watchFields: ['mode'], condition: 'values.mode !== "hidden"' },
          { type: 'required', watchFields: ['mode'], condition: 'values.mode === "full"' },
          { type: 'disabled', watchFields: ['mode'], condition: 'values.mode === "readonly"' },
        ],
      }]

      const formData = reactive<FormData>({ mode: 'edit' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('name')!.visible).toBe(true)
      expect(stateMap.value.get('name')!.required).toBe(false)
      expect(stateMap.value.get('name')!.disabled).toBe(false)

      formData.mode = 'full'
      expect(stateMap.value.get('name')!.required).toBe(true)

      formData.mode = 'readonly'
      expect(stateMap.value.get('name')!.disabled).toBe(true)

      formData.mode = 'hidden'
      expect(stateMap.value.get('name')!.visible).toBe(false)
    })
  })

  // =====================================================
  // 3. 数据源 ↔ 联动
  // =====================================================

  describe('数据源 ↔ 联动', () => {
    it('API 联动配置正确传递', () => {
      const schema: PartialWidget[] = [
        { type: 'select', field: 'province', label: '省份' },
        {
          type: 'select',
          field: 'city',
          label: '城市',
          linkages: [{
            type: 'options',
            watchFields: ['province'],
            condition: 'values.province !== ""',
            thenApi: {
              url: '/api/cities',
              method: 'get',
              params: { province: '${values.province}' },
            },
          }],
        },
      ]

      const formData = reactive<FormData>({ province: 'guangdong', city: '' })
      const { stateMap } = useLinkage(schema, formData)

      const optionsApi = stateMap.value.get('city')!.optionsApi
      expect(optionsApi).toBeDefined()
      expect(optionsApi!.url).toBe('/api/cities')
      expect(optionsApi!.method).toBe('get')
      expect(optionsApi!.params).toEqual({ province: '${values.province}' })
    })

    it('无匹配联动时 optionsApi 为 undefined', () => {
      const schema: PartialWidget[] = [{
        type: 'select',
        field: 'city',
        label: '城市',
        linkages: [{
          type: 'options',
          watchFields: ['province'],
          condition: 'values.province === "beijing"',
          thenApi: { url: '/api/cities' },
        }],
      }]

      const formData = reactive<FormData>({ province: 'guangdong' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('city')!.optionsApi).toBeUndefined()
    })

    it('多个 options 联动条件互斥时只生效一个', () => {
      const schema: PartialWidget[] = [{
        type: 'select',
        field: 'sub',
        label: '子项',
        linkages: [
          {
            type: 'options',
            watchFields: ['parent'],
            condition: 'values.parent === "A"',
            thenOptions: [{ label: 'A1', value: 'a1' }],
          },
          {
            type: 'options',
            watchFields: ['parent'],
            condition: 'values.parent === "B"',
            thenOptions: [{ label: 'B1', value: 'b1' }],
          },
        ],
      }]

      const formData = reactive<FormData>({ parent: '' })
      const { stateMap } = useLinkage(schema, formData)

      formData.parent = 'A'
      expect(stateMap.value.get('sub')!.options).toEqual([{ label: 'A1', value: 'a1' }])

      formData.parent = 'B'
      expect(stateMap.value.get('sub')!.options).toEqual([{ label: 'B1', value: 'b1' }])

      formData.parent = 'C'
      expect(stateMap.value.get('sub')!.options).toBeUndefined()
    })
  })

  // =====================================================
  // 4. 事件 → 弹窗 → 数据源
  // =====================================================

  describe('事件 → 弹窗 → 数据源', () => {
    it('open-dialog 打开弹窗', () => {
      const openDialog = vi.fn()
      const ctx = createCtx({ openDialog })

      executeEventAction({ type: 'open-dialog', target: 'dlg1' }, ctx)
      expect(openDialog).toHaveBeenCalledWith('dlg1')
    })

    it('close-dialog 关闭弹窗', () => {
      const closeDialog = vi.fn()
      const ctx = createCtx({ closeDialog })

      executeEventAction({ type: 'close-dialog' }, ctx)
      expect(closeDialog).toHaveBeenCalled()
    })

    it('弹窗确认后触发提交 + 关闭 + 刷新', () => {
      const submitForm = vi.fn()
      const closeDialog = vi.fn()
      const triggerEvent = vi.fn()
      const ctx = createCtx({ submitForm, closeDialog, triggerEvent })

      const actions: SchemaEventAction[] = [
        { type: 'submit' },
        { type: 'close-dialog' },
        { type: 'trigger-event', target: 'table1', event: 'refresh' },
      ]

      for (const action of actions) executeEventAction(action, ctx)

      expect(submitForm).toHaveBeenCalled()
      expect(closeDialog).toHaveBeenCalled()
      expect(triggerEvent).toHaveBeenCalledWith('table1', 'refresh')
    })

    it('api 动作发送请求', () => {
      const ctx = createCtx({
        getFormData: vi.fn().mockReturnValue({ name: 'test' }),
      })

      executeEventAction({
        type: 'api',
        apiUrl: '/api/save',
        apiMethod: 'post',
        apiParams: 'formData',
      }, ctx)

      expect(ctx.emit).toHaveBeenCalledWith('api-call', {
        url: '/api/save',
        method: 'post',
        params: { name: 'test' },
      })
    })

    it('navigate 动作触发路由跳转', () => {
      const ctx = createCtx()

      executeEventAction({
        type: 'navigate',
        navigatePath: '/detail',
        navigateQuery: { id: '123' },
      }, ctx)

      expect(ctx.emit).toHaveBeenCalledWith('navigate', {
        path: '/detail',
        query: { id: '123' },
      })
    })

    it('copy 动作复制文本', () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
      })

      const ctx = createCtx({
        getFormData: vi.fn().mockReturnValue({ code: 'ABC123' }),
      })

      executeEventAction({ type: 'copy', text: 'formData.code' }, ctx)
      expect(writeText).toHaveBeenCalledWith('ABC123')
    })
  })

  // =====================================================
  // 5. 三系统联合场景
  // =====================================================

  describe('三系统联合场景', () => {
    it('场景: 审批流程 — 事件设置变量 → 联动显隐 → 条件提交', async () => {
      const variables = reactive<Record<string, unknown>>({
        approvalLevel: 0,
        canApprove: false,
      })

      const schema: PartialWidget[] = [
        { type: 'select', field: 'type', label: '审批类型' },
        {
          type: 'textarea',
          field: 'reason',
          label: '审批理由',
          linkages: [
            { type: 'visible', watchFields: ['type'], condition: 'values.type === "reject"' },
            { type: 'required', watchFields: ['type'], condition: 'values.type === "reject"' },
          ],
        },
        {
          type: 'button',
          field: 'approveBtn',
          label: '批准',
          linkages: [{
            type: 'disabled',
            watchFields: ['type'],
            condition: 'values.type === "" || variables.canApprove === false',
          }],
          events: [{
            trigger: 'click',
            condition: 'values.type !== "" && variables.canApprove',
            actions: [
              { type: 'set-variable', variable: 'approvalLevel', value: 1 },
              { type: 'submit' },
            ],
          }],
        },
      ]

      const formData = reactive<FormData>({ type: '', reason: '' })
      const { stateMap } = useLinkage(schema, formData, variables)

      // 初始状态
      expect(stateMap.value.get('reason')!.visible).toBe(false)
      expect(stateMap.value.get('approveBtn')!.disabled).toBe(true)

      // 选择拒绝类型 → 理由显示且必填
      formData.type = 'reject'
      expect(stateMap.value.get('reason')!.visible).toBe(true)
      expect(stateMap.value.get('reason')!.required).toBe(true)

      // 启用审批权限 → 按钮启用
      variables.canApprove = true
      expect(stateMap.value.get('approveBtn')!.disabled).toBe(false)

      // 点击批准按钮 → 设置变量 + 提交
      const submitForm = vi.fn()
      const ctx = createCtx({
        variables,
        setVariable: (name, value) => { variables[name] = value },
        submitForm,
        getFormData: vi.fn().mockReturnValue(formData),
      })

      await triggerWidgetEvent(schema[2] as Widget, 'click', ctx)
      expect(variables.approvalLevel).toBe(1)
      expect(submitForm).toHaveBeenCalled()
    })

    it('场景: 动态表单 — 变量控制字段显隐 + 必填', () => {
      const variables = reactive<Record<string, unknown>>({ formMode: 'simple' })

      const schema: PartialWidget[] = [
        {
          type: 'select',
          field: 'formMode',
          label: '表单模式',
          events: [{
            trigger: 'change',
            actions: [{
              type: 'set-variable',
              variable: 'formMode',
              value: '${formData.formMode}',
            }],
          }],
        },
        {
          type: 'input',
          field: 'name',
          label: '名称',
          linkages: [{
            type: 'required',
            watchFields: ['formMode'],
            condition: 'variables.formMode !== "simple"',
          }],
        },
        {
          type: 'textarea',
          field: 'description',
          label: '描述',
          linkages: [
            { type: 'visible', watchFields: ['formMode'], condition: 'variables.formMode === "detailed"' },
            { type: 'required', watchFields: ['formMode'], condition: 'variables.formMode === "detailed"' },
          ],
        },
        {
          type: 'upload',
          field: 'attachment',
          label: '附件',
          linkages: [{
            type: 'visible',
            watchFields: ['formMode'],
            condition: 'variables.formMode === "full"',
          }],
        },
      ]

      const formData = reactive<FormData>({ formMode: 'simple', name: '', description: '' })
      const { stateMap } = useLinkage(schema, formData, variables)

      // simple 模式
      expect(stateMap.value.get('name')!.required).toBe(false)
      expect(stateMap.value.get('description')!.visible).toBe(false)
      expect(stateMap.value.get('attachment')!.visible).toBe(false)

      // detailed 模式
      variables.formMode = 'detailed'
      expect(stateMap.value.get('name')!.required).toBe(true)
      expect(stateMap.value.get('description')!.visible).toBe(true)
      expect(stateMap.value.get('description')!.required).toBe(true)

      // full 模式
      variables.formMode = 'full'
      expect(stateMap.value.get('attachment')!.visible).toBe(true)
    })

    it('场景: 表格操作 — exposed 控制按钮状态 + 事件链', () => {
      const exposed = reactive<Record<string, Record<string, unknown>>>({
        table1: { selectedRows: [] as unknown[], loading: false },
      })

      const schema: PartialWidget[] = [
        {
          type: 'button',
          field: 'editBtn',
          label: '编辑',
          linkages: [{
            type: 'disabled',
            watchFields: ['mode'],
            condition: 'exposed.table1.selectedRows.length !== 1',
          }],
          events: [{
            trigger: 'click',
            actions: [
              { type: 'open-dialog', target: 'editDlg' },
            ],
          }],
        },
        {
          type: 'button',
          field: 'deleteBtn',
          label: '删除',
          linkages: [{
            type: 'disabled',
            watchFields: ['mode'],
            condition: 'exposed.table1.selectedRows.length === 0',
          }],
          events: [{
            trigger: 'click',
            confirm: '确定删除选中的行？',
            actions: [
              { type: 'api', apiUrl: '/api/delete', apiMethod: 'post', apiParams: 'formData' },
              { type: 'trigger-event', target: 'table1', event: 'refresh' },
            ],
          }],
        },
      ]

      const formData = reactive<FormData>({ mode: 'edit' })
      const { stateMap } = useLinkage(schema, formData, undefined, exposed)

      // 初始：无选中行 → 两个按钮都禁用
      expect(stateMap.value.get('editBtn')!.disabled).toBe(true)
      expect(stateMap.value.get('deleteBtn')!.disabled).toBe(true)

      // 选中一行 → 两个按钮启用
      exposed.table1.selectedRows = [{ id: 1 }]
      expect(stateMap.value.get('editBtn')!.disabled).toBe(false)
      expect(stateMap.value.get('deleteBtn')!.disabled).toBe(false)

      // 选中多行 → 编辑禁用（单选），删除启用（多选）
      exposed.table1.selectedRows = [{ id: 1 }, { id: 2 }]
      expect(stateMap.value.get('editBtn')!.disabled).toBe(true)
      expect(stateMap.value.get('deleteBtn')!.disabled).toBe(false)
    })

    it('场景: 级联选择 — 数据源 + 联动 + 事件', () => {
      const variables = reactive<Record<string, unknown>>({ selectedProvince: '' })

      const schema: PartialWidget[] = [
        {
          type: 'select',
          field: 'province',
          label: '省份',
          events: [{
            trigger: 'change',
            actions: [{
              type: 'set-variable',
              variable: 'selectedProvince',
              value: '${formData.province}',
            }],
          }],
        },
        {
          type: 'select',
          field: 'city',
          label: '城市',
          linkages: [{
            type: 'options',
            watchFields: ['province'],
            condition: 'values.province !== ""',
            thenApi: {
              url: '/api/cities',
              method: 'get',
              params: { province: '${values.province}' },
            },
          }],
        },
        {
          type: 'select',
          field: 'district',
          label: '区县',
          linkages: [{
            type: 'visible',
            watchFields: ['city'],
            condition: 'values.city !== ""',
          }, {
            type: 'options',
            watchFields: ['city'],
            condition: 'values.city !== ""',
            thenApi: {
              url: '/api/districts',
              params: { city: '${values.city}' },
            },
          }],
        },
      ]

      const formData = reactive<FormData>({ province: '', city: '', district: '' })
      const { stateMap } = useLinkage(schema, formData, variables)

      // 初始：区县隐藏
      expect(stateMap.value.get('district')!.visible).toBe(false)

      // 选择省份 → 城市有 API 联动
      formData.province = 'guangdong'
      expect(stateMap.value.get('city')!.optionsApi).toBeDefined()
      expect(stateMap.value.get('city')!.optionsApi!.url).toBe('/api/cities')

      // 选择城市 → 区县显示并有 API 联动
      formData.city = 'shenzhen'
      expect(stateMap.value.get('district')!.visible).toBe(true)
      expect(stateMap.value.get('district')!.optionsApi).toBeDefined()
    })

    it('场景: 多步骤表单 — 变量追踪步骤 + 联动控制显隐', () => {
      const variables = reactive<Record<string, unknown>>({ currentStep: 1 })

      const schema: PartialWidget[] = [
        {
          type: 'input',
          field: 'step1Field',
          label: '步骤1字段',
          linkages: [{
            type: 'visible',
            watchFields: ['step'],
            condition: 'variables.currentStep === 1',
          }],
        },
        {
          type: 'input',
          field: 'step2Field',
          label: '步骤2字段',
          linkages: [{
            type: 'visible',
            watchFields: ['step'],
            condition: 'variables.currentStep === 2',
          }],
        },
        {
          type: 'input',
          field: 'step3Field',
          label: '步骤3字段',
          linkages: [{
            type: 'visible',
            watchFields: ['step'],
            condition: 'variables.currentStep === 3',
          }],
        },
      ]

      const formData = reactive<FormData>({ step: 1, step1Field: '', step2Field: '', step3Field: '' })
      const { stateMap } = useLinkage(schema, formData, variables)

      expect(stateMap.value.get('step1Field')!.visible).toBe(true)
      expect(stateMap.value.get('step2Field')!.visible).toBe(false)
      expect(stateMap.value.get('step3Field')!.visible).toBe(false)

      variables.currentStep = 2
      expect(stateMap.value.get('step1Field')!.visible).toBe(false)
      expect(stateMap.value.get('step2Field')!.visible).toBe(true)

      variables.currentStep = 3
      expect(stateMap.value.get('step2Field')!.visible).toBe(false)
      expect(stateMap.value.get('step3Field')!.visible).toBe(true)
    })
  })

  // =====================================================
  // 6. 边界场景
  // =====================================================

  describe('边界场景', () => {
    it('变量为 undefined 时联动条件安全求值', () => {
      const variables = reactive<Record<string, unknown>>({ x: undefined })
      const schema: PartialWidget[] = [{
        type: 'input',
        field: 'f',
        label: 'F',
        linkages: [{
          type: 'visible',
          watchFields: ['a'],
          condition: 'variables.x === undefined',
        }],
      }]

      const formData = reactive<FormData>({ a: 1 })
      const { stateMap } = useLinkage(schema, formData, variables)
      expect(stateMap.value.get('f')!.visible).toBe(true)
    })

    it('变量为 null 时联动条件安全求值', () => {
      const variables = reactive<Record<string, unknown>>({ x: null })
      const schema: PartialWidget[] = [{
        type: 'input',
        field: 'f',
        label: 'F',
        linkages: [{
          type: 'visible',
          watchFields: ['a'],
          condition: 'variables.x === null',
        }],
      }]

      const formData = reactive<FormData>({ a: 1 })
      const { stateMap } = useLinkage(schema, formData, variables)
      expect(stateMap.value.get('f')!.visible).toBe(true)
    })

    it('exposed 为空对象时条件安全求值', () => {
      const exposed = reactive<Record<string, Record<string, unknown>>>({})
      const schema: PartialWidget[] = [{
        type: 'input',
        field: 'f',
        label: 'F',
        linkages: [{
          type: 'visible',
          watchFields: ['a'],
          condition: 'exposed.table === undefined',
        }],
      }]

      const formData = reactive<FormData>({ a: 1 })
      const { stateMap } = useLinkage(schema, formData, undefined, exposed)
      expect(stateMap.value.get('f')!.visible).toBe(true)
    })

    it('空 schema 不报错', () => {
      const formData = reactive<FormData>({})
      const { stateMap } = useLinkage([], formData)
      expect(stateMap.value.size).toBe(0)
    })

    it('无 linkages 的 widget 不产生联动状态', () => {
      const schema: PartialWidget[] = [{
        type: 'input',
        field: 'plain',
        label: '普通字段',
      }]

      const formData = reactive<FormData>({ plain: '' })
      const { stateMap } = useLinkage(schema, formData)

      // 无 linkages 的 widget 不会出现在 stateMap 中
      expect(stateMap.value.get('plain')).toBeUndefined()
    })

    it('事件 confirm 被用户取消时中断动作链', async () => {
      const confirm = vi.fn().mockRejectedValue(new Error('cancel'))
      const submitForm = vi.fn()
      const ctx = createCtx({ confirm, submitForm, getFormData: vi.fn().mockReturnValue({}) })

      const widget = createWidget({
        events: [{
          trigger: 'click',
          confirm: '确定提交？',
          actions: [{ type: 'submit' }],
        }],
      })

      await triggerWidgetEvent(widget, 'click', ctx)
      expect(confirm).toHaveBeenCalledWith('确定提交？')
      expect(submitForm).not.toHaveBeenCalled()
    })

    it('事件 confirm 无 ctx.confirm 时跳过该事件', async () => {
      const submitForm = vi.fn()
      const ctx = createCtx({ submitForm, getFormData: vi.fn().mockReturnValue({}) })
      // ctx.confirm 未设置

      const widget = createWidget({
        events: [{
          trigger: 'click',
          confirm: '确定？',
          actions: [{ type: 'submit' }],
        }],
      })

      await triggerWidgetEvent(widget, 'click', ctx)
      expect(submitForm).not.toHaveBeenCalled()
    })

    it('show/hide 动作切换 widget hidden 属性', () => {
      const widget = createWidget({ hidden: true })
      const ctx = createCtx({
        findWidget: vi.fn().mockReturnValue(widget),
        updateWidget: vi.fn((_id, patch) => Object.assign(widget, patch)),
      })

      executeEventAction({ type: 'show', target: 'w1' }, ctx)
      expect(widget.hidden).toBe(false)

      executeEventAction({ type: 'hide', target: 'w1' }, ctx)
      expect(widget.hidden).toBe(true)
    })

    it('switch-tab 动作更新 tabs activeKey', () => {
      const widget = createWidget({
        type: 'tabs',
        props: { activeKey: 'tab1' },
      })
      const ctx = createCtx({
        findWidget: vi.fn().mockReturnValue(widget),
        updateWidget: vi.fn((_id, patch) => Object.assign(widget, patch)),
      })

      executeEventAction({ type: 'switch-tab', target: 'w1', value: 'tab2' }, ctx)
      expect(widget.props!.activeKey).toBe('tab2')
    })

    it('post-message 发送到 parent', () => {
      const postMessage = vi.fn()
      Object.defineProperty(window, 'parent', {
        value: { postMessage },
        writable: true,
      })

      const ctx = createCtx({
        getFormData: vi.fn().mockReturnValue({ id: 123 }),
      })

      executeEventAction({
        type: 'post-message',
        message: { type: 'save', formId: 'formData.id' },
      }, ctx)

      expect(postMessage).toHaveBeenCalledWith({ type: 'save', formId: 123 }, '*')
    })
  })
})
