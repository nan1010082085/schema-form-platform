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
import { it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { evaluateCondition } from '@/engine/eventEngine'
import type { SchemaType, Widget, WidgetEvent, WidgetRenderState } from '@/widgets/base/types'

/**
 * 计算 Widget 的渲染状态（visible / disabled / required）。
 *
 * 纯同步状态计算，不执行规则的副作用动作。
 * 从已废弃的 ruleEngine 迁移到测试工具层。
 *
 * @param widget - 目标 Widget
 * @param formData - 当前表单数据（field → value）
 * @returns 渲染状态
 */
export function computeWidgetRenderState(
  widget: Widget,
  formData: Record<string, unknown>,
  exposed?: Record<string, Record<string, unknown>>,
): WidgetRenderState {
  const staticDisabled = (widget.props?.disabled as boolean) ?? false
  const staticRequired = widget.validationRules?.some((r) => r.required) ?? false

  if (!widget.rules?.length) {
    return {
      visible: !widget.hidden,
      disabled: staticDisabled,
      required: staticRequired,
    }
  }

  let visible = !widget.hidden
  let disabled = staticDisabled

  for (const rule of widget.rules) {
    const shouldExecute = rule.watches.some((watch) => {
      if (watch.type === 'field') {
        return watch.source in formData
      }
      return false
    })
    if (!shouldExecute) continue

    if (!evaluateCondition(rule.condition, formData, exposed)) continue

    for (const action of rule.actions) {
      switch (action.type) {
        case 'hide':
          visible = false
          break
        case 'visible':
          visible = true
          break
        case 'disabled':
          disabled = true
          break
      }
    }
  }

  return {
    visible,
    disabled,
    required: staticRequired,
  }
}

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
