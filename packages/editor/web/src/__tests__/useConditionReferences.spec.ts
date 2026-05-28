/**
 * useConditionReferences 测试
 *
 * 覆盖：
 * - collectFields: 递归收集有 field 的组件
 * - collectVariables: 画布变量 + 组件变量
 * - collectExposed: 从 widget registry 收集 exposedValues
 * - 分组过滤: fieldRefs / variableRefs / exposedRefs
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useConditionReferences } from '@/composables/useConditionReferences'
import { useWidgetStore } from '@/stores/widget'
import { useBoardStore } from '@/stores/board'
import { registerWidget } from '@/widgets/registry'
import type { Widget } from '@/widgets/base/types'

vi.mock('@/composables/useLogger', () => ({
  useLogger: vi.fn(() => ({
    warn: vi.fn(),
    info: vi.fn(),
    rule: vi.fn(),
    event: vi.fn(),
    debug: vi.fn(),
  })),
}))

function makeWidget(overrides: Partial<Widget> & { type: string; id: string }): Widget {
  return {
    name: `Fg${overrides.type}`,
    field: undefined,
    label: undefined,
    props: {},
    options: undefined,
    defaultValue: undefined,
    position: { x: 0, y: 0, w: 100, h: 40 },
    style: {},
    variables: undefined,
    events: undefined,
    rules: undefined,
    linkages: undefined,
    disabled: undefined,
    api: undefined,
    validationRules: undefined,
    formId: undefined,
    tabKey: undefined,
    colIndex: undefined,
    hidden: undefined,
    children: undefined,
    lifecycle: undefined,
    ...overrides,
  } as Widget
}

describe('useConditionReferences', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ---- collectFields ----

  describe('collectFields', () => {
    it('collects fields from flat widgets', async () => {
      const widgetStore = useWidgetStore()
      widgetStore.widgets = [
        makeWidget({ id: 'w1', type: 'input', field: 'name', label: '姓名' }),
        makeWidget({ id: 'w2', type: 'input', field: 'email', label: '邮箱' }),
      ]

      const { fieldRefs } = useConditionReferences()
      await nextTick()

      expect(fieldRefs.value).toHaveLength(2)
      expect(fieldRefs.value[0].value).toBe('name')
      expect(fieldRefs.value[0].label).toContain('姓名')
      expect(fieldRefs.value[0].group).toBe('field')
    })

    it('recursively collects fields from nested children', async () => {
      const widgetStore = useWidgetStore()
      widgetStore.widgets = [
        makeWidget({
          id: 'card1',
          type: 'card',
          children: [
            makeWidget({ id: 'w1', type: 'input', field: 'name' }),
            makeWidget({
              id: 'tabs1',
              type: 'tabs',
              children: [
                makeWidget({ id: 'w2', type: 'input', field: 'tab_field' }),
              ],
            }),
          ],
        }),
      ]

      const { fieldRefs } = useConditionReferences()
      await nextTick()

      expect(fieldRefs.value).toHaveLength(2)
      expect(fieldRefs.value.map(r => r.value)).toEqual(['name', 'tab_field'])
    })

    it('skips widgets without field', async () => {
      const widgetStore = useWidgetStore()
      widgetStore.widgets = [
        makeWidget({ id: 'w1', type: 'divider' }),
        makeWidget({ id: 'w2', type: 'title', label: 'Title' }),
      ]

      const { fieldRefs } = useConditionReferences()
      await nextTick()

      expect(fieldRefs.value).toHaveLength(0)
    })

    it('uses field as fallback label when label is missing', async () => {
      const widgetStore = useWidgetStore()
      widgetStore.widgets = [
        makeWidget({ id: 'w1', type: 'input', field: 'myField' }),
      ]

      const { fieldRefs } = useConditionReferences()
      await nextTick()

      expect(fieldRefs.value[0].label).toContain('myField')
    })
  })

  // ---- collectVariables ----

  describe('collectVariables', () => {
    it('collects board-level variables', async () => {
      const boardStore = useBoardStore()
      boardStore.addVariable({ name: 'threshold', type: 'number', defaultValue: 100 })
      boardStore.addVariable({ name: 'mode', type: 'string', defaultValue: 'edit' })

      const { variableRefs } = useConditionReferences()
      await nextTick()

      expect(variableRefs.value).toHaveLength(2)
      expect(variableRefs.value[0].value).toBe('variables.threshold')
      expect(variableRefs.value[0].label).toContain('画布变量')
      expect(variableRefs.value[1].value).toBe('variables.mode')
    })

    it('collects widget-level variables', async () => {
      const widgetStore = useWidgetStore()
      widgetStore.widgets = [
        makeWidget({
          id: 'w1',
          type: 'table',
          variables: [
            { name: 'selectedRows', type: 'array' },
            { name: 'loading', type: 'boolean' },
          ],
        }),
      ]

      const { variableRefs } = useConditionReferences()
      await nextTick()

      expect(variableRefs.value).toHaveLength(2)
      expect(variableRefs.value[0].value).toBe('variables.selectedRows')
      expect(variableRefs.value[0].label).toContain('组件变量')
    })

    it('collects variables from nested widgets', async () => {
      const widgetStore = useWidgetStore()
      widgetStore.widgets = [
        makeWidget({
          id: 'card1',
          type: 'card',
          children: [
            makeWidget({
              id: 'w1',
              type: 'table',
              variables: [{ name: 'loading', type: 'boolean' }],
            }),
          ],
        }),
      ]

      const { variableRefs } = useConditionReferences()
      await nextTick()

      expect(variableRefs.value).toHaveLength(1)
      expect(variableRefs.value[0].value).toBe('variables.loading')
    })

    it('combines board and widget variables', async () => {
      const boardStore = useBoardStore()
      boardStore.addVariable({ name: 'globalVar', type: 'string' })

      const widgetStore = useWidgetStore()
      widgetStore.widgets = [
        makeWidget({
          id: 'w1',
          type: 'table',
          variables: [{ name: 'localVar', type: 'number' }],
        }),
      ]

      const { variableRefs } = useConditionReferences()
      await nextTick()

      expect(variableRefs.value).toHaveLength(2)
      expect(variableRefs.value.map(r => r.value)).toEqual(['variables.globalVar', 'variables.localVar'])
    })
  })

  // ---- collectExposed ----

  describe('collectExposed', () => {
    it('collects exposed values from registered widgets', async () => {
      registerWidget({
        name: 'FgInput',
        displayName: '输入框',
        type: 'input',
        group: 'form',
        component: {} as never,
        create: (id: string) => makeWidget({ id, type: 'input' }),
        config: {
          name: 'FgInput',
          displayName: '输入框',
          description: '输入框',
          exposedValues: [
            { key: 'value', type: 'string', description: '当前值' },
          ],
        },
      })

      const widgetStore = useWidgetStore()
      widgetStore.widgets = [
        makeWidget({ id: 'input1', type: 'input', field: 'name' }),
      ]

      const { exposedRefs } = useConditionReferences()
      await nextTick()

      expect(exposedRefs.value).toHaveLength(1)
      expect(exposedRefs.value[0].value).toBe('exposed.input1.value')
      expect(exposedRefs.value[0].group).toBe('exposed')
    })

    it('collects exposed values from nested widgets', async () => {
      registerWidget({
        name: 'FgTable',
        displayName: '表格',
        type: 'table',
        group: 'table',
        component: {} as never,
        create: (id: string) => makeWidget({ id, type: 'table' }),
        config: {
          name: 'FgTable',
          displayName: '表格',
          description: '表格',
          exposedValues: [
            { key: 'selectedRows', type: 'array', description: '选中行' },
            { key: 'loading', type: 'boolean', description: '加载状态' },
          ],
        },
      })

      const widgetStore = useWidgetStore()
      widgetStore.widgets = [
        makeWidget({
          id: 'card1',
          type: 'card',
          children: [
            makeWidget({ id: 'table1', type: 'table' }),
          ],
        }),
      ]

      const { exposedRefs } = useConditionReferences()
      await nextTick()

      expect(exposedRefs.value).toHaveLength(2)
      expect(exposedRefs.value[0].value).toBe('exposed.table1.selectedRows')
      expect(exposedRefs.value[1].value).toBe('exposed.table1.loading')
    })

    it('skips widgets without exposedValues in registry', async () => {
      registerWidget({
        name: 'FgDivider',
        displayName: '分割线',
        type: 'divider',
        group: 'static',
        component: {} as never,
        create: (id: string) => makeWidget({ id, type: 'divider' }),
        config: {
          name: 'FgDivider',
          displayName: '分割线',
          description: '分割线',
        },
      })

      const widgetStore = useWidgetStore()
      widgetStore.widgets = [
        makeWidget({ id: 'd1', type: 'divider' }),
      ]

      const { exposedRefs } = useConditionReferences()
      await nextTick()

      expect(exposedRefs.value).toHaveLength(0)
    })
  })

  // ---- conditionReferences (combined) ----

  describe('conditionReferences', () => {
    it('returns all three groups combined', async () => {
      registerWidget({
        name: 'FgInput',
        displayName: '输入框',
        type: 'input',
        group: 'form',
        component: {} as never,
        create: (id: string) => makeWidget({ id, type: 'input' }),
        config: {
          name: 'FgInput',
          displayName: '输入框',
          description: '输入框',
          exposedValues: [
            { key: 'value', type: 'string', description: '当前值' },
          ],
        },
      })

      const boardStore = useBoardStore()
      boardStore.addVariable({ name: 'count', type: 'number' })

      const widgetStore = useWidgetStore()
      widgetStore.widgets = [
        makeWidget({ id: 'input1', type: 'input', field: 'name' }),
      ]

      const { conditionReferences } = useConditionReferences()
      await nextTick()

      const groups = conditionReferences.value.map(r => r.group)
      expect(groups).toContain('field')
      expect(groups).toContain('variable')
      expect(groups).toContain('exposed')
      expect(conditionReferences.value.length).toBeGreaterThanOrEqual(3)
    })
  })
})
