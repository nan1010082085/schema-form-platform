import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgEditableTable from '../FgEditableTable.vue'

describe('FgEditableTable', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountEditableTable(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('editable-table', 'test_editable_table')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgEditableTable, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_editable_table')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_editable_table')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Store CRUD
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('editable-table', 'test_editable_table')
      store.addWidget(widget!)
      expect(store.findWidget('test_editable_table')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('editable-table', 'test_editable_table')
      store.addWidget(widget!)
      store.removeWidget('test_editable_table')
      expect(store.findWidget('test_editable_table')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('editable-table', 'test_editable_table')
      store.addWidget(widget!)
      store.updateWidget('test_editable_table', { label: '新标签' })
      expect(store.findWidget('test_editable_table')!.label).toBe('新标签')
    })
  })

  // Dimension 2: Props
  describe('Props', () => {
    it('默认 title 为 可编辑表格', () => {
      const widget = createWidget('editable-table', 'test_editable_table')!
      store.addWidget(widget)
      expect(widget.props?.title).toBe('可编辑表格')
    })

    it('默认 addButtonText 为 添加行', () => {
      const widget = createWidget('editable-table', 'test_editable_table')!
      store.addWidget(widget)
      expect(widget.props?.addButtonText).toBe('添加行')
    })

    it('默认 showAddButton 为 true', () => {
      const widget = createWidget('editable-table', 'test_editable_table')!
      store.addWidget(widget)
      expect(widget.props?.showAddButton).toBe(true)
    })

    it('默认 showDeleteButton 为 true', () => {
      const widget = createWidget('editable-table', 'test_editable_table')!
      store.addWidget(widget)
      expect(widget.props?.showDeleteButton).toBe(true)
    })

    it('默认 maxRows 为 0（不限）', () => {
      const widget = createWidget('editable-table', 'test_editable_table')!
      store.addWidget(widget)
      expect(widget.props?.maxRows).toBe(0)
    })

    it('title 可自定义', () => {
      const wrapper = mountEditableTable({ props: { title: '自定义标题' } })
      expect(wrapper.text()).toContain('自定义标题')
    })

    it('addButtonText 可自定义', () => {
      const widget = createWidget('editable-table', 'test_editable_table')!
      widget.props = { ...widget.props, addButtonText: '新增行' }
      store.addWidget(widget)
      expect(store.findWidget('test_editable_table')!.props!.addButtonText).toBe('新增行')
    })

    it('showAddButton=false 时隐藏添加按钮', () => {
      const wrapper = mountEditableTable({ props: { showAddButton: false } })
      expect(wrapper.find('.el-button').exists()).toBe(false)
    })

    it('maxRows 可配置', () => {
      const widget = createWidget('editable-table', 'test_editable_table')!
      widget.props = { ...widget.props, maxRows: 5 }
      store.addWidget(widget)
      expect(store.findWidget('test_editable_table')!.props!.maxRows).toBe(5)
    })

    it('columns 可配置', () => {
      const columns = [
        { prop: 'name', label: '姓名', width: 120 },
        { prop: 'age', label: '年龄', width: 80 },
      ]
      const widget = createWidget('editable-table', 'test_editable_table')!
      widget.props = { ...widget.props, columns }
      store.addWidget(widget)
      expect(store.findWidget('test_editable_table')!.props!.columns).toHaveLength(2)
    })

    it('渲染 el-table', () => {
      const wrapper = mountEditableTable()
      expect(wrapper.find('.el-table').exists()).toBe(true)
    })
  })

  // Dimension 3: Events
  describe('事件配置', () => {
    it('支持事件配置', () => {
      const widget = createWidget('editable-table', 'test_editable_table')!
      widget.events = [{ trigger: 'row-add', actions: [{ type: 'set-value', target: 'w2', value: {} }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_editable_table')!.events).toHaveLength(1)
    })

    it('支持多个事件配置', () => {
      const widget = createWidget('editable-table', 'test_editable_table')!
      widget.events = [
        { trigger: 'row-add', actions: [{ type: 'set-value', target: 'w2', value: {} }] },
        { trigger: 'row-delete', actions: [{ type: 'submit', target: 'form1' }] },
      ]
      store.addWidget(widget)
      expect(store.findWidget('test_editable_table')!.events).toHaveLength(2)
    })
  })

  // Dimension 4: Rules/Linkage
  describe('规则/联动', () => {
    it('支持 linkage 配置', () => {
      const widget = createWidget('editable-table', 'test_editable_table')!
      widget.linkages = [{
        watches: [{ type: 'field', source: 'status' }],
        condition: 'status === "readonly"',
        actions: [{ type: 'disabled', config: {} }],
      }]
      store.addWidget(widget)
      expect(store.findWidget('test_editable_table')!.linkages).toHaveLength(1)
    })

    it('支持 rules 配置', () => {
      const widget = createWidget('editable-table', 'test_editable_table')!
      widget.rules = [{
        watches: [{ type: 'field', source: 'lock' }],
        condition: 'lock === true',
        actions: [{ type: 'disabled', config: {} }],
      }]
      store.addWidget(widget)
      expect(store.findWidget('test_editable_table')!.rules).toHaveLength(1)
    })
  })

  // Dimension 5: Config panel
  describe('配置面板', () => {
    it('configPanels 包含 events 和 rules', () => {
      const item = getWidget('editable-table')
      expect(item?.config.configPanels).toContain('events')
      expect(item?.config.configPanels).toContain('rules')
    })

    it('configPanels 不包含 api', () => {
      const item = getWidget('editable-table')
      expect(item?.config.configPanels).not.toContain('api')
    })
  })
})
