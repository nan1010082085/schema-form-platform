/**
 * Linkage Integration Tests
 *
 * Tests the full linkage system end-to-end:
 * - useLinkage composable with PartialWidget[] and reactive FormData
 * - visible / disabled / required / set-value / options linkage types
 * - Multi-field watch scenarios
 * - Cycle detection and degradation
 * - Integration with widget store and registry
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { reactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { useLinkage } from '@/composables/useLinkage'
import type { PartialWidget } from '@/widgets/base/types'
import type { FormData } from '@/components/WidgetRenderer/types'

describe('Linkage Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  // ---- visible linkage ----

  describe('visible linkage', () => {
    it('hides widget when condition is false (visible=false)', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'detail'
      widget.linkages = [{
        type: 'visible',
        watchFields: ['status'],
        condition: 'values.status === "show"',
      }]
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        { type: 'input', field: 'status', label: 'Status' },
        {
          type: 'input',
          field: 'detail',
          label: 'Detail',
          linkages: widget.linkages,
        },
      ]

      // status='hide' => condition false => visible=false
      const formData = reactive<FormData>({ status: 'hide', detail: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('detail')?.visible).toBe(false)
    })

    it('shows widget when condition is true (visible=true)', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'detail'
      widget.linkages = [{
        type: 'visible',
        watchFields: ['status'],
        condition: 'values.status === "show"',
      }]
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        { type: 'input', field: 'status', label: 'Status' },
        {
          type: 'input',
          field: 'detail',
          label: 'Detail',
          linkages: widget.linkages,
        },
      ]

      // status='show' => condition true => visible=true
      const formData = reactive<FormData>({ status: 'show', detail: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('detail')?.visible).toBe(true)
    })
  })

  // ---- disabled linkage ----

  describe('disabled linkage', () => {
    it('disables widget when condition is met', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'reason'
      widget.linkages = [{
        type: 'disabled',
        watchFields: ['lock'],
        condition: 'values.lock === true',
      }]
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        { type: 'input', field: 'lock', label: 'Lock' },
        {
          type: 'input',
          field: 'reason',
          label: 'Reason',
          linkages: widget.linkages,
        },
      ]

      const formData = reactive<FormData>({ lock: true, reason: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('reason')?.disabled).toBe(true)
    })

    it('enables widget when condition is not met', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'reason'
      widget.linkages = [{
        type: 'disabled',
        watchFields: ['lock'],
        condition: 'values.lock === true',
      }]
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        { type: 'input', field: 'lock', label: 'Lock' },
        {
          type: 'input',
          field: 'reason',
          label: 'Reason',
          linkages: widget.linkages,
        },
      ]

      const formData = reactive<FormData>({ lock: false, reason: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('reason')?.disabled).toBe(false)
    })
  })

  // ---- required linkage ----

  describe('required linkage', () => {
    it('marks widget as required when condition is met', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'plateNumber'
      widget.linkages = [{
        type: 'required',
        watchFields: ['type'],
        condition: 'values.type === "other"',
      }]
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        { type: 'input', field: 'type', label: 'Type' },
        {
          type: 'input',
          field: 'plateNumber',
          label: 'Plate Number',
          linkages: widget.linkages,
        },
      ]

      const formData = reactive<FormData>({ type: 'other', plateNumber: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('plateNumber')?.required).toBe(true)
    })

    it('not required when condition is not met', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'plateNumber'
      widget.linkages = [{
        type: 'required',
        watchFields: ['type'],
        condition: 'values.type === "other"',
      }]
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        { type: 'input', field: 'type', label: 'Type' },
        {
          type: 'input',
          field: 'plateNumber',
          label: 'Plate Number',
          linkages: widget.linkages,
        },
      ]

      const formData = reactive<FormData>({ type: 'normal', plateNumber: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('plateNumber')?.required).toBe(false)
    })
  })

  // ---- set-value linkage ----

  describe('set-value linkage', () => {
    it('sets targetValue from thenValue literal when condition is met', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'w2'
      widget.linkages = [{
        type: 'set-value',
        watchFields: ['source'],
        condition: 'values.source === "auto"',
        thenValue: 'auto-filled',
      }]
      store.addWidget(widget)

      // Verify the widget store integration
      expect(widget.linkages[0].type).toBe('set-value')

      // Verify the linkage computation
      const schema: PartialWidget[] = [
        { type: 'input', field: 'source', label: 'Source' },
        {
          type: 'input',
          field: 'w2',
          label: 'Target',
          linkages: widget.linkages,
        },
      ]

      const formData = reactive<FormData>({ source: 'auto' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('w2')?.targetValue).toBe('auto-filled')
    })

    it('targetValue undefined when condition is false', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'w2'
      widget.linkages = [{
        type: 'set-value',
        watchFields: ['source'],
        condition: 'values.source === "auto"',
        thenValue: 'auto-filled',
      }]
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        { type: 'input', field: 'source', label: 'Source' },
        {
          type: 'input',
          field: 'w2',
          label: 'Target',
          linkages: widget.linkages,
        },
      ]

      const formData = reactive<FormData>({ source: 'manual' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('w2')?.targetValue).toBeUndefined()
    })

    it('set-value with valueSource copies field value', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'target'
      widget.linkages = [{
        type: 'set-value',
        watchFields: ['source'],
        condition: 'values.source !== ""',
        valueSource: 'source',
      }]
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        { type: 'input', field: 'source', label: 'Source' },
        {
          type: 'input',
          field: 'target',
          label: 'Target',
          linkages: widget.linkages,
        },
      ]

      const formData = reactive<FormData>({ source: 'hello', target: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('target')?.targetValue).toBe('hello')
    })
  })

  // ---- multi-field watch ----

  describe('multi-field watch', () => {
    it('triggers correctly with multiple watch fields', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'approval'
      widget.linkages = [{
        type: 'visible',
        watchFields: ['a', 'b'],
        condition: 'values.a === 1 && values.b === 2',
      }]
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        { type: 'input', field: 'a', label: 'A' },
        { type: 'input', field: 'b', label: 'B' },
        {
          type: 'input',
          field: 'approval',
          label: 'Approval',
          linkages: widget.linkages,
        },
      ]

      // Both conditions met => visible
      const formData1 = reactive<FormData>({ a: 1, b: 2 })
      const { stateMap: stateMap1 } = useLinkage(schema, formData1)
      expect(stateMap1.value.get('approval')?.visible).toBe(true)

      // Only one condition met => not visible
      const formData2 = reactive<FormData>({ a: 1, b: 3 })
      const { stateMap: stateMap2 } = useLinkage(schema, formData2)
      expect(stateMap2.value.get('approval')?.visible).toBe(false)
    })

    it('reactively updates when watch fields change', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'result'
      widget.linkages = [{
        type: 'disabled',
        watchFields: ['role', 'level'],
        condition: 'values.role === "manager" && values.level >= 5',
      }]
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        { type: 'input', field: 'role', label: 'Role' },
        { type: 'input', field: 'level', label: 'Level' },
        {
          type: 'input',
          field: 'result',
          label: 'Result',
          linkages: widget.linkages,
        },
      ]

      const formData = reactive<FormData>({ role: 'staff', level: 3 })
      const { stateMap } = useLinkage(schema, formData)

      // Initially not disabled
      expect(stateMap.value.get('result')?.disabled).toBe(false)

      // Change role to manager but level still low
      formData.role = 'manager'
      expect(stateMap.value.get('result')?.disabled).toBe(false)

      // Change level to 5 => both conditions met
      formData.level = 5
      expect(stateMap.value.get('result')?.disabled).toBe(true)
    })
  })

  // ---- no linkage => default state ----

  describe('default state', () => {
    it('no linkage means default state', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'plain'
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        { type: 'input', field: 'plain', label: 'Plain' },
      ]

      const formData = reactive<FormData>({})
      const { stateMap } = useLinkage(schema, formData)

      // Fields without linkages are not in stateMap
      expect(stateMap.value.has('plain')).toBe(false)
    })

    it('fields with empty linkages array are not in stateMap', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'empty'
      widget.linkages = []
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        {
          type: 'input',
          field: 'empty',
          label: 'Empty',
          linkages: [],
        },
      ]

      const formData = reactive<FormData>({})
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.has('empty')).toBe(false)
    })
  })

  // ---- cycle detection ----

  describe('cycle detection', () => {
    it('degrades fields with circular dependencies to default state', () => {
      const store = useWidgetStore()
      const widgetA = createWidget('input', 'w1')!
      widgetA.field = 'fieldA'
      widgetA.linkages = [{
        type: 'visible',
        watchFields: ['fieldB'],
        condition: 'values.fieldB === "show"',
      }]
      store.addWidget(widgetA)

      const widgetB = createWidget('input', 'w2')!
      widgetB.field = 'fieldB'
      widgetB.linkages = [{
        type: 'visible',
        watchFields: ['fieldA'],
        condition: 'values.fieldA === "show"',
      }]
      store.addWidget(widgetB)

      const schema: PartialWidget[] = [
        {
          type: 'input',
          field: 'fieldA',
          label: 'A',
          linkages: widgetA.linkages,
        },
        {
          type: 'input',
          field: 'fieldB',
          label: 'B',
          linkages: widgetB.linkages,
        },
      ]

      const formData = reactive<FormData>({ fieldA: '', fieldB: '' })
      const { stateMap } = useLinkage(schema, formData)

      // Cyclic fields degrade to default state
      expect(stateMap.value.get('fieldA')?.visible).toBe(true) // default
      expect(stateMap.value.get('fieldB')?.visible).toBe(true) // default
      expect(stateMap.value.get('fieldA')?.disabled).toBe(false) // default
      expect(stateMap.value.get('fieldB')?.required).toBe(false) // default
    })
  })

  // ---- options linkage ----

  describe('options linkage', () => {
    it('overrides options with thenOptions when condition is met', () => {
      const store = useWidgetStore()
      const widget = createWidget('select', 'w1')!
      widget.field = 'city'
      widget.linkages = [{
        type: 'options',
        watchFields: ['province'],
        condition: 'values.province === "guangdong"',
        thenOptions: [
          { label: 'Guangzhou', value: 'guangzhou' },
          { label: 'Shenzhen', value: 'shenzhen' },
        ],
      }]
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        { type: 'input', field: 'province', label: 'Province' },
        {
          type: 'select',
          field: 'city',
          label: 'City',
          options: [{ label: 'Select city', value: '' }],
          linkages: widget.linkages,
        },
      ]

      const formData = reactive<FormData>({ province: 'guangdong', city: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('city')?.options).toEqual([
        { label: 'Guangzhou', value: 'guangzhou' },
        { label: 'Shenzhen', value: 'shenzhen' },
      ])
    })
  })

  // ---- combined linkage types on same field ----

  describe('combined linkage types', () => {
    it('applies visible + disabled + required independently on same field', () => {
      const store = useWidgetStore()
      const widget = createWidget('textarea', 'w1')!
      widget.field = 'comment'
      widget.linkages = [
        {
          type: 'visible',
          watchFields: ['mode'],
          condition: 'values.mode !== "simple"',
        },
        {
          type: 'required',
          watchFields: ['mode'],
          condition: 'values.mode === "detailed"',
        },
        {
          type: 'disabled',
          watchFields: ['mode'],
          condition: 'values.mode === "readonly"',
        },
      ]
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        { type: 'input', field: 'mode', label: 'Mode' },
        {
          type: 'textarea',
          field: 'comment',
          label: 'Comment',
          linkages: widget.linkages,
        },
      ]

      // simple mode: hidden, not required, not disabled
      const formData1 = reactive<FormData>({ mode: 'simple' })
      const { stateMap: sm1 } = useLinkage(schema, formData1)
      expect(sm1.value.get('comment')?.visible).toBe(false)
      expect(sm1.value.get('comment')?.required).toBe(false)
      expect(sm1.value.get('comment')?.disabled).toBe(false)

      // detailed mode: visible, required
      const formData2 = reactive<FormData>({ mode: 'detailed' })
      const { stateMap: sm2 } = useLinkage(schema, formData2)
      expect(sm2.value.get('comment')?.visible).toBe(true)
      expect(sm2.value.get('comment')?.required).toBe(true)
      expect(sm2.value.get('comment')?.disabled).toBe(false)

      // readonly mode: visible, not required, disabled
      const formData3 = reactive<FormData>({ mode: 'readonly' })
      const { stateMap: sm3 } = useLinkage(schema, formData3)
      expect(sm3.value.get('comment')?.visible).toBe(true)
      expect(sm3.value.get('comment')?.required).toBe(false)
      expect(sm3.value.get('comment')?.disabled).toBe(true)
    })
  })

  // ---- nested schema children ----

  describe('nested children', () => {
    it('evaluates linkage on nested field inside containers', () => {
      const store = useWidgetStore()
      const widget = createWidget('input', 'w1')!
      widget.field = 'nested'
      widget.linkages = [{
        type: 'visible',
        watchFields: ['toggle'],
        condition: 'values.toggle === true',
      }]
      store.addWidget(widget)

      const schema: PartialWidget[] = [
        {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col',
              children: [
                {
                  type: 'input',
                  field: 'nested',
                  label: 'Nested',
                  linkages: widget.linkages,
                },
              ],
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ toggle: false })
      const { stateMap } = useLinkage(schema, formData)
      expect(stateMap.value.get('nested')?.visible).toBe(false)

      formData.toggle = true
      expect(stateMap.value.get('nested')?.visible).toBe(true)
    })
  })
})
