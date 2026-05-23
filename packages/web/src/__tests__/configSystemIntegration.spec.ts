/**
 * 三大配置系统交互测试
 *
 * 覆盖：
 * - 事件 → 联动 → 数据源 完整链路
 * - 事件触发变量变化 → 联动重算
 * - 联动条件控制事件可用性
 * - 数据源加载后触发联动
 * - 复杂多系统交互场景
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, ref, computed } from 'vue'
import { executeEventAction, triggerWidgetEvent, type EventExecutionContext } from '@/engine/eventEngine'
import { useLinkage } from '@/composables/useLinkage'
import type { Widget, PartialWidget, SchemaEventAction } from '@/widgets/base/types'
import type { FormData } from '@/components/WidgetRenderer/types'

vi.mock('@/composables/useLogger', () => ({
  useLogger: vi.fn(() => ({
    warn: vi.fn(),
    info: vi.fn(),
    rule: vi.fn(),
    event: vi.fn(),
    debug: vi.fn(),
  })),
}))

describe('三大配置系统交互', () => {
  // ---- 事件 → 变量 → 联动 ----

  describe('事件 → 变量 → 联动', () => {
    it('点击按钮设置变量，触发联动显隐', () => {
      const variables = reactive<Record<string, unknown>>({ showAdvanced: false })

      // 事件上下文
      const ctx: EventExecutionContext = {
        findWidget: vi.fn(),
        updateWidget: vi.fn(),
        openDialog: vi.fn(),
        closeDialog: vi.fn(),
        submitForm: vi.fn(),
        resetForm: vi.fn(),
        getFormData: vi.fn().mockReturnValue({}),
        emit: vi.fn(),
        variables,
        setVariable: (name: string, value: unknown) => { variables[name] = value },
      }

      // 联动配置
      const schema: PartialWidget[] = [
        {
          type: 'input',
          field: 'advancedOption',
          label: '高级选项',
          linkages: [{
            type: 'visible',
            watchFields: ['mode'],
            condition: 'variables.showAdvanced === true',
          }],
        },
      ]

      const formData = reactive<FormData>({ mode: 'edit' })
      const { stateMap } = useLinkage(schema, formData, variables)

      // 初始：隐藏
      expect(stateMap.value.get('advancedOption')!.visible).toBe(false)

      // 执行 set-variable 动作
      executeEventAction({ type: 'set-variable', variable: 'showAdvanced', value: true }, ctx)

      // 联动重算：显示
      expect(stateMap.value.get('advancedOption')!.visible).toBe(true)
    })

    it('事件链中多个变量变化累积', () => {
      const variables = reactive<Record<string, unknown>>({ step: 0, completed: false })

      const ctx: EventExecutionContext = {
        findWidget: vi.fn(),
        updateWidget: vi.fn(),
        openDialog: vi.fn(),
        closeDialog: vi.fn(),
        submitForm: vi.fn(),
        resetForm: vi.fn(),
        getFormData: vi.fn().mockReturnValue({}),
        emit: vi.fn(),
        variables,
        setVariable: (name: string, value: unknown) => { variables[name] = value },
      }

      // 执行事件链
      const actions: SchemaEventAction[] = [
        { type: 'set-variable', variable: 'step', value: 1 },
        { type: 'set-variable', variable: 'step', value: 2 },
        { type: 'set-variable', variable: 'step', value: 3 },
        { type: 'set-variable', variable: 'completed', value: true },
      ]

      for (const action of actions) {
        executeEventAction(action, ctx)
      }

      expect(variables.step).toBe(3)
      expect(variables.completed).toBe(true)
    })
  })

  // ---- 联动条件控制事件触发 ----

  describe('联动条件控制事件', () => {
    it('按钮禁用时事件不应触发（UI 层控制）', () => {
      const schema: PartialWidget[] = [
        {
          type: 'button',
          field: 'submitBtn',
          label: '提交',
          linkages: [{
            type: 'disabled',
            watchFields: ['status'],
            condition: 'values.status === "draft"',
          }],
          events: [{
            trigger: 'click',
            actions: [{ type: 'submit' }],
          }],
        },
      ]

      const formData = reactive<FormData>({ status: 'draft' })
      const { stateMap } = useLinkage(schema, formData)

      // 按钮禁用
      expect(stateMap.value.get('submitBtn')!.disabled).toBe(true)

      // 事件配置仍然存在
      expect(schema[0].events).toHaveLength(1)
      expect(schema[0].events![0].trigger).toBe('click')

      // UI 层应根据 disabled 状态阻止事件触发
    })

    it('条件满足后按钮启用', () => {
      const schema: PartialWidget[] = [
        {
          type: 'button',
          field: 'submitBtn',
          label: '提交',
          linkages: [{
            type: 'disabled',
            watchFields: ['status'],
            condition: 'values.status === "draft"',
          }],
        },
      ]

      const formData = reactive<FormData>({ status: 'draft' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('submitBtn')!.disabled).toBe(true)

      formData.status = 'published'
      expect(stateMap.value.get('submitBtn')!.disabled).toBe(false)
    })
  })

  // ---- 事件 → 弹窗 → 数据源 ----

  describe('事件 → 弹窗 → 数据源', () => {
    it('点击按钮打开弹窗', () => {
      const openDialog = vi.fn()
      const ctx: EventExecutionContext = {
        findWidget: vi.fn().mockReturnValue({
          id: 'dlg1',
          type: 'dialog',
          props: { title: '编辑', width: '600px' },
          children: [],
        }),
        updateWidget: vi.fn(),
        openDialog,
        closeDialog: vi.fn(),
        submitForm: vi.fn(),
        resetForm: vi.fn(),
        getFormData: vi.fn().mockReturnValue({}),
        emit: vi.fn(),
      }

      executeEventAction({ type: 'open-dialog', target: 'dlg1' }, ctx)
      expect(openDialog).toHaveBeenCalledWith('dlg1')
    })

    it('弹窗确认后触发提交和刷新', () => {
      const submitForm = vi.fn()
      const triggerEvent = vi.fn()
      const ctx: EventExecutionContext = {
        findWidget: vi.fn(),
        updateWidget: vi.fn(),
        openDialog: vi.fn(),
        closeDialog: vi.fn(),
        submitForm,
        resetForm: vi.fn(),
        getFormData: vi.fn().mockReturnValue({}),
        emit: vi.fn(),
        triggerEvent,
      }

      // 模拟弹窗确认后的动作链
      const actions: SchemaEventAction[] = [
        { type: 'submit' },
        { type: 'close-dialog' },
        { type: 'trigger-event', target: 'table1', event: 'refresh' },
      ]

      for (const action of actions) {
        executeEventAction(action, ctx)
      }

      expect(submitForm).toHaveBeenCalled()
      expect(ctx.closeDialog).toHaveBeenCalled()
      expect(triggerEvent).toHaveBeenCalledWith('table1', 'refresh')
    })
  })

  // ---- 数据源加载后触发联动 ----

  describe('数据源 → 联动', () => {
    it('options 联动根据数据源切换选项', () => {
      const schema: PartialWidget[] = [
        { type: 'select', field: 'type', label: '类型' },
        {
          type: 'select', field: 'subType', label: '子类型',
          linkages: [{
            type: 'options',
            watchFields: ['type'],
            condition: 'values.type === "A"',
            thenOptions: [
              { label: 'A1', value: 'a1' },
              { label: 'A2', value: 'a2' },
            ],
          }, {
            type: 'options',
            watchFields: ['type'],
            condition: 'values.type === "B"',
            thenOptions: [
              { label: 'B1', value: 'b1' },
              { label: 'B2', value: 'b2' },
            ],
          }],
        },
      ]

      const formData = reactive<FormData>({ type: '', subType: '' })
      const { stateMap } = useLinkage(schema, formData)

      // 无选择
      expect(stateMap.value.get('subType')!.options).toBeUndefined()

      // 选择 A
      formData.type = 'A'
      expect(stateMap.value.get('subType')!.options).toEqual([
        { label: 'A1', value: 'a1' },
        { label: 'A2', value: 'a2' },
      ])

      // 切换到 B
      formData.type = 'B'
      expect(stateMap.value.get('subType')!.options).toEqual([
        { label: 'B1', value: 'b1' },
        { label: 'B2', value: 'b2' },
      ])
    })

    it('API 联动配置传递参数', () => {
      const schema: PartialWidget[] = [
        { type: 'select', field: 'province', label: '省份' },
        {
          type: 'select', field: 'city', label: '城市',
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
      expect(optionsApi!.params).toEqual({ province: '${values.province}' })
    })
  })

  // ---- 复杂多系统交互场景 ----

  describe('复杂场景', () => {
    it('场景: 审批流程', () => {
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
          linkages: [{
            type: 'visible',
            watchFields: ['type'],
            condition: 'values.type === "reject"',
          }, {
            type: 'required',
            watchFields: ['type'],
            condition: 'values.type === "reject"',
          }],
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
            condition: 'type !== "" && variables.canApprove',
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

      // 选择拒绝类型
      formData.type = 'reject'
      expect(stateMap.value.get('reason')!.visible).toBe(true)
      expect(stateMap.value.get('reason')!.required).toBe(true)

      // 启用审批权限
      variables.canApprove = true
      expect(stateMap.value.get('approveBtn')!.disabled).toBe(false)
    })

    it('场景: 动态表单字段', () => {
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
          linkages: [{
            type: 'visible',
            watchFields: ['formMode'],
            condition: 'variables.formMode === "detailed"',
          }, {
            type: 'required',
            watchFields: ['formMode'],
            condition: 'variables.formMode === "detailed"',
          }],
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
      expect(stateMap.value.get('attachment')!.visible).toBe(false)

      // full 模式
      variables.formMode = 'full'
      expect(stateMap.value.get('attachment')!.visible).toBe(true)
    })

    it('场景: 表格操作联动', () => {
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
        {
          type: 'button',
          field: 'refreshBtn',
          label: '刷新',
          events: [{
            trigger: 'click',
            actions: [
              { type: 'trigger-event', target: 'table1', event: 'refresh' },
            ],
          }],
        },
      ]

      const formData = reactive<FormData>({ mode: 'edit' })
      const { stateMap } = useLinkage(schema, formData, undefined, exposed)

      // 初始：无选中行
      expect(stateMap.value.get('editBtn')!.disabled).toBe(true)
      expect(stateMap.value.get('deleteBtn')!.disabled).toBe(true)

      // 选中一行
      exposed.table1.selectedRows = [{ id: 1 }]
      expect(stateMap.value.get('editBtn')!.disabled).toBe(false)
      expect(stateMap.value.get('deleteBtn')!.disabled).toBe(false)

      // 选中多行
      exposed.table1.selectedRows = [{ id: 1 }, { id: 2 }]
      expect(stateMap.value.get('editBtn')!.disabled).toBe(true) // 编辑只允许单选
      expect(stateMap.value.get('deleteBtn')!.disabled).toBe(false) // 删除允许多选
    })

    it('场景: 条件表达式中三系统联合', () => {
      const variables = reactive<Record<string, unknown>>({ debug: false, maxItems: 10 })
      const exposed = reactive<Record<string, Record<string, unknown>>>({
        list: { total: 5 },
      })

      const schema: PartialWidget[] = [
        {
          type: 'button',
          field: 'actionBtn',
          label: '执行',
          linkages: [{
            type: 'disabled',
            watchFields: ['status'],
            condition: 'values.status !== "ready" || variables.debug || exposed.list.total > variables.maxItems',
          }],
        },
      ]

      const formData = reactive<FormData>({ status: 'ready' })
      const { stateMap } = useLinkage(schema, formData, variables, exposed)

      // 初始：状态正确，非调试，总数未超限
      expect(stateMap.value.get('actionBtn')!.disabled).toBe(false)

      // 开启调试模式
      variables.debug = true
      expect(stateMap.value.get('actionBtn')!.disabled).toBe(true)

      // 关闭调试，但总数超限
      variables.debug = false
      exposed.list.total = 15
      expect(stateMap.value.get('actionBtn')!.disabled).toBe(true)

      // 恢复正常
      exposed.list.total = 5
      expect(stateMap.value.get('actionBtn')!.disabled).toBe(false)

      // 状态不对
      formData.status = 'pending'
      expect(stateMap.value.get('actionBtn')!.disabled).toBe(true)
    })
  })
})
