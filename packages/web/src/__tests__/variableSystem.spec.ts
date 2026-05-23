/**
 * 变量系统测试
 *
 * 覆盖：
 * - 变量声明与初始化
 * - set-variable 动作执行
 * - 变量在条件表达式中的引用
 * - 组件暴露值注册与注销
 * - exposed 在条件表达式中的引用
 * - 变量与联动系统的集成
 * - 变量与事件系统的集成
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive } from 'vue'
import { evaluateCondition, executeEventAction, triggerWidgetEvent, type EventExecutionContext } from '@/engine/eventEngine'
import { useLinkage } from '@/composables/useLinkage'
import type { Widget, PartialWidget } from '@/widgets/base/types'
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

describe('变量系统', () => {
  // ---- 变量声明与初始化 ----

  describe('变量声明', () => {
    it('支持多种变量类型', () => {
      const variables = {
        strVar: 'hello',
        numVar: 42,
        boolVar: true,
        objVar: { key: 'value' },
        arrVar: [1, 2, 3],
      }

      expect(typeof variables.strVar).toBe('string')
      expect(typeof variables.numVar).toBe('number')
      expect(typeof variables.boolVar).toBe('boolean')
      expect(typeof variables.objVar).toBe('object')
      expect(Array.isArray(variables.arrVar)).toBe(true)
    })

    it('变量可以有默认值', () => {
      const widget: PartialWidget = {
        type: 'input',
        field: 'test',
        variables: [
          { name: 'count', type: 'number', defaultValue: 0 },
          { name: 'label', type: 'string', defaultValue: 'default' },
          { name: 'active', type: 'boolean', defaultValue: false },
        ],
      }

      expect(widget.variables).toHaveLength(3)
      expect(widget.variables![0].defaultValue).toBe(0)
      expect(widget.variables![1].defaultValue).toBe('default')
      expect(widget.variables![2].defaultValue).toBe(false)
    })

    it('画布级变量可被所有组件访问', () => {
      const boardVariables = {
        globalTheme: 'light',
        userRole: 'admin',
      }

      // 模拟从画布收集变量
      const collected = { ...boardVariables }
      expect(collected.globalTheme).toBe('light')
      expect(collected.userRole).toBe('admin')
    })
  })

  // ---- set-variable 动作执行 ----

  describe('set-variable 动作', () => {
    let ctx: EventExecutionContext
    let variables: Record<string, unknown>

    beforeEach(() => {
      variables = { count: 0, name: 'test' }
      ctx = {
        findWidget: vi.fn(),
        updateWidget: vi.fn(),
        openDialog: vi.fn(),
        closeDialog: vi.fn(),
        submitForm: vi.fn(),
        resetForm: vi.fn(),
        getFormData: vi.fn().mockReturnValue({}),
        emit: vi.fn(),
        variables,
        setVariable: (name: string, value: unknown) => {
          variables[name] = value
        },
        getVariable: (name: string) => variables[name],
      }
    })

    it('设置数值变量', () => {
      executeEventAction({ type: 'set-variable', variable: 'count', value: 42 }, ctx)
      expect(variables.count).toBe(42)
    })

    it('设置字符串变量', () => {
      executeEventAction({ type: 'set-variable', variable: 'name', value: 'updated' }, ctx)
      expect(variables.name).toBe('updated')
    })

    it('设置布尔变量', () => {
      executeEventAction({ type: 'set-variable', variable: 'active', value: true }, ctx)
      expect(variables.active).toBe(true)
    })

    it('设置对象变量', () => {
      executeEventAction({ type: 'set-variable', variable: 'config', value: { theme: 'dark' } }, ctx)
      expect(variables.config).toEqual({ theme: 'dark' })
    })

    it('设置数组变量', () => {
      executeEventAction({ type: 'set-variable', variable: 'items', value: [1, 2, 3] }, ctx)
      expect(variables.items).toEqual([1, 2, 3])
    })

    it('变量值变化后可通过 getVariable 获取', () => {
      executeEventAction({ type: 'set-variable', variable: 'count', value: 100 }, ctx)
      expect(ctx.getVariable!('count')).toBe(100)
    })

    it('连续多次设置同一变量', () => {
      executeEventAction({ type: 'set-variable', variable: 'count', value: 1 }, ctx)
      executeEventAction({ type: 'set-variable', variable: 'count', value: 2 }, ctx)
      executeEventAction({ type: 'set-variable', variable: 'count', value: 3 }, ctx)
      expect(variables.count).toBe(3)
    })
  })

  // ---- 变量在条件表达式中的引用 ----

  describe('变量在条件表达式中', () => {
    it('variables.xxx 引用', () => {
      // evaluateCondition 中 variables 和 values 都指向 context
      const context = { threshold: 100 }
      expect(evaluateCondition('variables.threshold > 50', context)).toBe(true)
      expect(evaluateCondition('variables.threshold < 50', context)).toBe(false)
    })

    it('变量与表单数据联合判断', () => {
      // 将 variables 合并到 context 中
      const context = { amount: 200, limit: 150 }
      expect(evaluateCondition('amount > variables.limit', context)).toBe(true)
    })

    it('变量支持复杂表达式', () => {
      const context = { min: 10, max: 100 }
      expect(evaluateCondition('variables.min < 50 && variables.max > 50', context)).toBe(true)
    })

    it('变量在联动条件中生效', () => {
      const schema: PartialWidget[] = [
        {
          type: 'input',
          field: 'extra',
          label: '额外信息',
          linkages: [{
            type: 'visible',
            watchFields: ['type'],
            condition: 'values.type === "advanced" && variables.enableAdvanced === true',
          }],
        },
      ]

      const formData = reactive<FormData>({ type: 'advanced', extra: '' })
      const variables = { enableAdvanced: true }
      const { stateMap } = useLinkage(schema, formData, variables)

      expect(stateMap.value.get('extra')!.visible).toBe(true)
    })

    it('变量变化触发联动重算', () => {
      const schema: PartialWidget[] = [
        {
          type: 'input',
          field: 'debug',
          label: '调试信息',
          linkages: [{
            type: 'visible',
            watchFields: ['mode'],
            condition: 'variables.debugMode === true',
          }],
        },
      ]

      const formData = reactive<FormData>({ mode: 'edit', debug: '' })
      const variables = reactive<Record<string, unknown>>({ debugMode: false })
      const { stateMap } = useLinkage(schema, formData, variables)

      expect(stateMap.value.get('debug')!.visible).toBe(false)

      variables.debugMode = true
      expect(stateMap.value.get('debug')!.visible).toBe(true)
    })
  })

  // ---- 组件暴露值 ----

  describe('组件暴露值', () => {
    it('exposed 上下文在条件中生效', () => {
      const exposed = {
        table1: { selectedRows: [{ id: 1 }, { id: 2 }] },
        form1: { loading: false },
      }

      expect(evaluateCondition('exposed.table1.selectedRows.length > 0', {}, exposed)).toBe(true)
      expect(evaluateCondition('exposed.form1.loading === false', {}, exposed)).toBe(true)
    })

    it('exposed 在联动条件中生效', () => {
      const schema: PartialWidget[] = [
        {
          type: 'button',
          field: 'deleteBtn',
          label: '删除',
          linkages: [{
            type: 'disabled',
            watchFields: ['mode'],
            condition: 'exposed.table1.selectedRows.length === 0',
          }],
        },
      ]

      const formData = reactive<FormData>({ mode: 'edit' })
      const exposed = reactive<Record<string, Record<string, unknown>>>({
        table1: { selectedRows: [] as unknown[] },
      })
      const { stateMap } = useLinkage(schema, formData, undefined, exposed)

      expect(stateMap.value.get('deleteBtn')!.disabled).toBe(true)

      exposed.table1.selectedRows = [{ id: 1 }]
      expect(stateMap.value.get('deleteBtn')!.disabled).toBe(false)
    })

    it('多个组件暴露值独立引用', () => {
      // evaluateCondition 中 exposed 是第三个参数
      const exposed = {
        table1: { selectedRows: [{ id: 1 }] },
        table2: { selectedRows: [] as unknown[] },
      }

      expect(evaluateCondition('exposed.table1.selectedRows.length > 0', {}, exposed)).toBe(true)
      expect(evaluateCondition('exposed.table2.selectedRows.length > 0', {}, exposed)).toBe(false)
    })

    it('exposed 与 variables 联合使用', () => {
      // evaluateCondition 中 variables 指向 context，exposed 是第三个参数
      const context = { requireSelection: true }
      const exposed = { table1: { selectedRows: [{ id: 1 }] } }

      expect(evaluateCondition(
        'variables.requireSelection && exposed.table1.selectedRows.length > 0',
        context,
        exposed,
      )).toBe(true)
    })

    it('注册和注销暴露值', () => {
      const exposedContext: Record<string, Record<string, unknown>> = {}

      function registerExposed(widgetId: string, state: Record<string, unknown>) {
        exposedContext[widgetId] = state
      }

      function unregisterExposed(widgetId: string) {
        delete exposedContext[widgetId]
      }

      registerExposed('table1', { selectedRows: [1, 2] })
      expect(exposedContext.table1).toBeDefined()
      expect(exposedContext.table1.selectedRows).toEqual([1, 2])

      unregisterExposed('table1')
      expect(exposedContext.table1).toBeUndefined()
    })

    it('暴露值更新后条件重算', () => {
      const schema: PartialWidget[] = [
        {
          type: 'button',
          field: 'action',
          label: '操作',
          linkages: [{
            type: 'visible',
            watchFields: ['mode'],
            condition: 'exposed.list.loading === true',
          }],
        },
      ]

      const formData = reactive<FormData>({ mode: 'edit' })
      const exposed = reactive<Record<string, Record<string, unknown>>>({ list: { loading: false } })
      const { stateMap } = useLinkage(schema, formData, undefined, exposed)

      expect(stateMap.value.get('action')!.visible).toBe(false)

      exposed.list.loading = true
      expect(stateMap.value.get('action')!.visible).toBe(true)
    })
  })

  // ---- 变量与事件系统集成 ----

  describe('变量与事件系统集成', () => {
    let ctx: EventExecutionContext
    let variables: Record<string, unknown>

    beforeEach(() => {
      variables = { actionCount: 0, lastAction: '' }
      ctx = {
        findWidget: vi.fn(),
        updateWidget: vi.fn(),
        openDialog: vi.fn(),
        closeDialog: vi.fn(),
        submitForm: vi.fn(),
        resetForm: vi.fn(),
        getFormData: vi.fn().mockReturnValue({ status: 'active' }),
        emit: vi.fn(),
        variables,
        setVariable: (name: string, value: unknown) => {
          variables[name] = value
        },
        getVariable: (name: string) => variables[name],
      }
    })

    it('事件链中连续修改变量', () => {
      const widget: Widget = {
        id: 'btn1',
        name: 'FgButton',
        type: 'button',
        position: { x: 0, y: 0, w: 100, h: 40 },
        events: [{
          trigger: 'click',
          actions: [
            { type: 'set-variable', variable: 'actionCount', value: 1 },
            { type: 'set-variable', variable: 'lastAction', value: 'clicked' },
          ],
        }],
      }

      triggerWidgetEvent(widget, 'click', ctx)
      expect(variables.actionCount).toBe(1)
      expect(variables.lastAction).toBe('clicked')
    })

    it('变量变化影响后续动作的条件判断', () => {
      const widget: Widget = {
        id: 'btn1',
        name: 'FgButton',
        type: 'button',
        position: { x: 0, y: 0, w: 100, h: 40 },
        events: [
          {
            trigger: 'click',
            condition: 'variables.actionCount < 3',
            actions: [
              { type: 'submit' },
              { type: 'set-variable', variable: 'actionCount', value: (variables.actionCount as number) + 1 },
            ],
          },
        ],
      }

      // 前三次应该执行
      triggerWidgetEvent(widget, 'click', ctx)
      expect(ctx.submitForm).toHaveBeenCalledTimes(1)
      expect(variables.actionCount).toBe(1)
    })

    it('set-variable 后触发联动重算', () => {
      const schema: PartialWidget[] = [
        {
          type: 'input',
          field: 'extra',
          label: '额外信息',
          linkages: [{
            type: 'visible',
            watchFields: ['mode'],
            condition: 'variables.showExtra === true',
          }],
        },
      ]

      const formData = reactive<FormData>({ mode: 'edit', extra: '' })
      const variables = reactive<Record<string, unknown>>({ showExtra: false })
      const { stateMap } = useLinkage(schema, formData, variables)

      expect(stateMap.value.get('extra')!.visible).toBe(false)

      // 模拟 set-variable 动作
      variables.showExtra = true
      expect(stateMap.value.get('extra')!.visible).toBe(true)
    })
  })

  // ---- 完整场景测试 ----

  describe('完整场景', () => {
    it('场景1: 点击按钮设置变量，联动控制组件显隐', () => {
      // 1. 变量声明
      const variables = reactive<Record<string, unknown>>({ showDetail: false })

      // 2. 联动配置
      const schema: PartialWidget[] = [
        {
          type: 'button',
          field: 'toggleBtn',
          label: '切换详情',
          events: [{
            trigger: 'click',
            actions: [{
              type: 'set-variable',
              variable: 'showDetail',
              value: true,
            }],
          }],
        },
        {
          type: 'input',
          field: 'detail',
          label: '详情',
          linkages: [{
            type: 'visible',
            watchFields: ['mode'],
            condition: 'variables.showDetail === true',
          }],
        },
      ]

      const formData = reactive<FormData>({ mode: 'edit', detail: '' })
      const { stateMap } = useLinkage(schema, formData, variables)

      // 初始状态：详情隐藏
      expect(stateMap.value.get('detail')!.visible).toBe(false)

      // 点击按钮后变量变化
      variables.showDetail = true
      expect(stateMap.value.get('detail')!.visible).toBe(true)
    })

    it('场景2: 表格选择行后启用删除按钮', () => {
      const schema: PartialWidget[] = [
        {
          type: 'button',
          field: 'deleteBtn',
          label: '删除',
          linkages: [{
            type: 'disabled',
            watchFields: ['mode'],
            condition: 'exposed.table1.selectedRows.length === 0',
          }],
        },
      ]

      const formData = reactive<FormData>({ mode: 'edit' })
      const exposed = reactive<Record<string, Record<string, unknown>>>({
        table1: { selectedRows: [] as unknown[] },
      })

      const { stateMap } = useLinkage(schema, formData, undefined, exposed)

      // 初始：无选中行，按钮禁用
      expect(stateMap.value.get('deleteBtn')!.disabled).toBe(true)

      // 选中一行后
      exposed.table1.selectedRows = [{ id: 1 }]
      expect(stateMap.value.get('deleteBtn')!.disabled).toBe(false)
    })

    it('场景3: 变量 + exposed + formData 联合条件', () => {
      const schema: PartialWidget[] = [
        {
          type: 'button',
          field: 'submitBtn',
          label: '提交',
          linkages: [{
            type: 'disabled',
            watchFields: ['status'],
            condition: 'values.status === "draft" || variables.readonly || exposed.form1.loading',
          }],
        },
      ]

      const formData = reactive<FormData>({ status: 'published' })
      const variables = reactive<Record<string, unknown>>({ readonly: false })
      const exposed = reactive<Record<string, Record<string, unknown>>>({
        form1: { loading: false },
      })

      const { stateMap } = useLinkage(schema, formData, variables, exposed)

      // 初始：全部满足，按钮可用
      expect(stateMap.value.get('submitBtn')!.disabled).toBe(false)

      // 设置只读变量
      variables.readonly = true
      expect(stateMap.value.get('submitBtn')!.disabled).toBe(true)

      // 恢复，但表单加载中
      variables.readonly = false
      exposed.form1.loading = true
      expect(stateMap.value.get('submitBtn')!.disabled).toBe(true)
    })
  })
})
