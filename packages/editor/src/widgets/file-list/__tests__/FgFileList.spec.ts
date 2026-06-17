import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgFileList from '../FgFileList.vue'
import { fileListConfig } from '../config'

describe('FgFileList', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountWidget(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('file-list', 'test_widget')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgFileList, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_widget')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_widget')!.style ?? {}),
        },
      },
    })
  }

  // Store CRUD
  describe('store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('file-list', 'test_fl')
      store.addWidget(widget!)
      expect(store.findWidget('test_fl')).toBeDefined()
    })

    it('更新 title 后 store 中同步', () => {
      const widget = createWidget('file-list', 'test_fl')!
      store.addWidget(widget)
      store.updateWidget('test_fl', { props: { ...widget.props, title: '附件资料' } })
      expect(store.findWidget('test_fl')!.props!.title).toBe('附件资料')
    })

    it('删除后 store 中不存在', () => {
      const widget = createWidget('file-list', 'test_fl')!
      store.addWidget(widget)
      store.removeWidget('test_fl')
      expect(store.findWidget('test_fl')).toBeNull()
    })
  })

  // Title prop
  describe('title 属性', () => {
    it('默认显示附件', () => {
      const wrapper = mountWidget()
      expect(wrapper.text()).toContain('附件')
    })

    it('自定义标题', () => {
      const wrapper = mountWidget({ props: { title: '上传文件' } })
      expect(wrapper.text()).toContain('上传文件')
    })
  })

  // allowDelete prop
  describe('allowDelete 属性', () => {
    it('allowDelete 默认为 true', () => {
      const widget = createWidget('file-list', 'test_widget')!
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.allowDelete).toBe(true)
    })

    it('可设置 allowDelete=false', () => {
      const widget = createWidget('file-list', 'test_widget')!
      widget.props = { ...widget.props, allowDelete: false }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.allowDelete).toBe(false)
    })
  })

  // allowPreview prop
  describe('allowPreview 属性', () => {
    it('allowPreview 默认为 true', () => {
      const widget = createWidget('file-list', 'test_widget')!
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.allowPreview).toBe(true)
    })

    it('可设置 allowPreview=false', () => {
      const widget = createWidget('file-list', 'test_widget')!
      widget.props = { ...widget.props, allowPreview: false }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.allowPreview).toBe(false)
    })
  })

  // Empty state
  describe('空状态', () => {
    it('显示暂无文件提示', () => {
      const wrapper = mountWidget()
      expect(wrapper.text()).toContain('暂无文件')
    })
  })

  // Config panels
  describe('配置面板声明', () => {
    it('configPanels 包含 events 和 api', () => {
      expect(fileListConfig.configPanels).toContain('events')
      expect(fileListConfig.configPanels).toContain('api')
    })
  })
})
