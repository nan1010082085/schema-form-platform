/**
 * widgetTestHarness — 5 维度 Widget 测试工具
 *
 * 为每种 SchemaType 提供 5 个可复用的测试维度：
 *   1. Drag & Drop — 拖放到画布 / 拖入容器 / 从容器拖出
 *   2. Property binding — 属性配置生效
 *   3. Event trigger — 事件注册生效
 *   4. Linkage — 联动规则计算
 *   5. Datasource — 数据源配置
 *
 * 使用方式：
 * ```ts
 * const harness = createWidgetTestHarness('input')
 * describe('input widget', () => {
 *   harness.testDragToCanvas()
 *   harness.testDragToContainer()
 *   harness.testDragOutFromContainer()
 *   harness.testPropertyBinding('placeholder', '请输入', (w) => {
 *     expect(w.props?.placeholder).toBe('请输入')
 *   })
 *   harness.testEventTrigger('click')
 *   harness.testDatasourceConfig()
 * })
 * ```
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { computeWidgetRenderState } from '@/engine/ruleEngine'
import type { SchemaType, Widget, WidgetEvent } from '@/widgets/base/types'

export function createWidgetTestHarness(type: SchemaType) {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  return {
    getStore: () => store,

    // Dimension 1: Drag & Drop ------------------------------------------------

    testDragToCanvas() {
      it(`[${type}] 拖放到画布 → store 中存在`, () => {
        const widget = createWidget(type, `test_${type}`)
        expect(widget).not.toBeNull()
        store.addWidget(widget!)
        const found = store.findWidget(`test_${type}`)
        expect(found).toBeDefined()
        expect(found!.type).toBe(type)
      })
    },

    testDragToContainer() {
      it(`[${type}] 拖入容器 → children 包含`, () => {
        const widget = createWidget(type, `test_${type}`)
        const container = createWidget('card', 'container_1')
        store.addWidget(container!)
        store.addWidget(widget!)
        store.addToContainer(`test_${type}`, 'container_1')
        const parent = store.findWidget('container_1')
        expect(parent!.children).toHaveLength(1)
        expect(parent!.children![0].type).toBe(type)
      })
    },

    testDragOutFromContainer() {
      it(`[${type}] 从容器拖出 → 回到 root`, () => {
        const widget = createWidget(type, `test_${type}`)
        const container = createWidget('card', 'container_1')
        store.addWidget(container!)
        store.addWidget(widget!)
        store.addToContainer(`test_${type}`, 'container_1')
        store.removeFromContainer(`test_${type}`)
        expect(store.isRootWidget(`test_${type}`)).toBe(true)
      })
    },

    // Dimension 2: Property binding -------------------------------------------

    testPropertyBinding(propKey: string, value: unknown, assertFn: (widget: Widget) => void) {
      it(`[${type}] 属性 ${propKey} 生效`, () => {
        const widget = createWidget(type, `test_${type}`)
        store.addWidget(widget!)
        store.updateWidget(`test_${type}`, { props: { [propKey]: value } })
        assertFn(store.findWidget(`test_${type}`)!)
      })
    },

    // Dimension 3: Event trigger ----------------------------------------------

    testEventTrigger(trigger: string) {
      it(`[${type}] 事件 ${trigger} 触发`, () => {
        const widget = createWidget(type, `test_${type}`)
        store.addWidget(widget!)

        const event: WidgetEvent = {
          trigger,
          actions: [{ type: 'show', target: 'some_target' }],
        }
        store.updateWidget(`test_${type}`, { events: [event] })

        const found = store.findWidget(`test_${type}`)
        expect(found!.events).toHaveLength(1)
        expect(found!.events![0].trigger).toBe(trigger)
      })
    },

    // Dimension 4: Linkage ----------------------------------------------------

    testLinkage(
      formData: Record<string, unknown>,
      expected: { visible?: boolean; disabled?: boolean },
    ) {
      it(`[${type}] linkage 生效`, () => {
        const widget = createWidget(type, `test_${type}`)
        store.addWidget(widget!)
        const found = store.findWidget(`test_${type}`)!
        const state = computeWidgetRenderState(found, formData)
        if (expected.visible !== undefined) {
          expect(state.visible).toBe(expected.visible)
        }
        if (expected.disabled !== undefined) {
          expect(state.disabled).toBe(expected.disabled)
        }
      })
    },

    // Dimension 5: Datasource -------------------------------------------------

    testDatasourceConfig() {
      it(`[${type}] 支持数据源配置`, () => {
        const widget = createWidget(type, `test_${type}`)
        store.addWidget(widget!)
        store.updateWidget(`test_${type}`, {
          api: { url: '/api/options', method: 'get' },
        })
        const found = store.findWidget(`test_${type}`)
        expect(found!.api).toBeDefined()
        expect(found!.api!.url).toBe('/api/options')
      })
    },
  }
}
