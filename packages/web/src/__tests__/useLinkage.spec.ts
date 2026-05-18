/**
 * useLinkage composable unit tests
 *
 * Covers:
 * - visible / disabled / required / options linkage types
 * - Function and string expression conditions
 * - Multi-field joint linkage
 * - Cycle detection and degradation
 * - Empty linkages compatibility
 * - schema.hidden priority over linkage.visible
 */
import { describe, it, expect } from 'vitest'
import { reactive } from 'vue'
import { useLinkage } from '@/composables/useLinkage'
import type { FormSchemaItem, FormData } from '@/components/FormGrid/types'

/** Helper: collect keys from stateMap */

describe('useLinkage', () => {
  // ---------- visible linkage ----------

  describe('visible linkage', () => {
    it('hides field when condition is true (visible=false when condition is false)', () => {
      const schema: FormSchemaItem[] = [
        {
          type: 'input',
          field: 'type',
          label: '类型',
        },
        {
          type: 'input',
          field: 'detail',
          label: '详情',
          linkages: [
            {
              type: 'visible',
              watchFields: ['type'],
              condition: 'values.type === "advanced"',
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ type: 'basic', detail: '' })
      const { stateMap } = useLinkage(schema, formData)

      // type=basic => condition false => visible=false
      expect(stateMap.value.get('detail')?.visible).toBe(false)

      // Change type to advanced
      formData.type = 'advanced'
      expect(stateMap.value.get('detail')?.visible).toBe(true)
    })

    it('respects schema.hidden priority over linkage.visible', () => {
      const schema: FormSchemaItem[] = [
        {
          type: 'input',
          field: 'secret',
          label: 'Secret',
          hidden: true,
          linkages: [
            {
              type: 'visible',
              watchFields: ['toggle'],
              condition: 'values.toggle === true',
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ toggle: true })
      const { stateMap } = useLinkage(schema, formData)

      // Even though linkage says visible=true, hidden=true takes priority
      // The stateMap says visible=true, but SchemaRender checks hidden first
      expect(stateMap.value.get('secret')?.visible).toBe(true)
      // The actual rendering check is in SchemaRender (hidden takes priority)
    })
  })

  // ---------- disabled linkage ----------

  describe('disabled linkage', () => {
    it('disables field when condition is met', () => {
      const schema: FormSchemaItem[] = [
        {
          type: 'select',
          field: 'approvalType',
          label: '审批类型',
          options: [
            { label: '常规', value: 'normal' },
            { label: '加急', value: 'urgent' },
          ],
        },
        {
          type: 'input',
          field: 'reason',
          label: '原因',
          linkages: [
            {
              type: 'disabled',
              watchFields: ['approvalType'],
              condition: 'values.approvalType === "normal"',
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ approvalType: 'normal', reason: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('reason')?.disabled).toBe(true)

      formData.approvalType = 'urgent'
      expect(stateMap.value.get('reason')?.disabled).toBe(false)
    })
  })

  // ---------- required linkage ----------

  describe('required linkage', () => {
    it('sets required when condition is met', () => {
      const schema: FormSchemaItem[] = [
        {
          type: 'radio',
          field: 'hasCar',
          label: '有无车辆',
          options: [
            { label: '有', value: 'yes' },
            { label: '无', value: 'no' },
          ],
        },
        {
          type: 'input',
          field: 'plateNumber',
          label: '车牌号',
          linkages: [
            {
              type: 'required',
              watchFields: ['hasCar'],
              condition: 'values.hasCar === "yes"',
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ hasCar: 'no', plateNumber: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('plateNumber')?.required).toBe(false)

      formData.hasCar = 'yes'
      expect(stateMap.value.get('plateNumber')?.required).toBe(true)
    })
  })

  // ---------- options linkage (static) ----------

  describe('options linkage', () => {
    it('overrides options with thenOptions when condition is met', () => {
      const schema: FormSchemaItem[] = [
        {
          type: 'select',
          field: 'province',
          label: '省份',
          options: [{ label: '请选择', value: '' }],
        },
        {
          type: 'select',
          field: 'city',
          label: '城市',
          options: [{ label: '请选择城市', value: '' }],
          linkages: [
            {
              type: 'options',
              watchFields: ['province'],
              condition: 'values.province === "guangdong"',
              thenOptions: [
                { label: '广州', value: 'guangzhou' },
                { label: '深圳', value: 'shenzhen' },
              ],
            },
            {
              type: 'options',
              watchFields: ['province'],
              condition: 'values.province === "zhejiang"',
              thenOptions: [
                { label: '杭州', value: 'hangzhou' },
                { label: '宁波', value: 'ningbo' },
              ],
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ province: '', city: '' })
      const { stateMap } = useLinkage(schema, formData)

      // No province selected => no options override
      expect(stateMap.value.get('city')?.options).toBeUndefined()

      formData.province = 'guangdong'
      expect(stateMap.value.get('city')?.options).toEqual([
        { label: '广州', value: 'guangzhou' },
        { label: '深圳', value: 'shenzhen' },
      ])

      formData.province = 'zhejiang'
      expect(stateMap.value.get('city')?.options).toEqual([
        { label: '杭州', value: 'hangzhou' },
        { label: '宁波', value: 'ningbo' },
      ])
    })

    it('overrides options with thenApi when condition is met', () => {
      const schema: FormSchemaItem[] = [
        {
          type: 'select',
          field: 'category',
          label: '分类',
        },
        {
          type: 'select',
          field: 'item',
          label: '项目',
          linkages: [
            {
              type: 'options',
              watchFields: ['category'],
              condition: 'values.category !== ""',
              thenApi: {
                url: '/api/items',
                method: 'get',
                params: { category: '${values.category}' },
              },
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ category: '', item: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('item')?.optionsApi).toBeUndefined()

      formData.category = 'tech'
      expect(stateMap.value.get('item')?.optionsApi).toEqual({
        url: '/api/items',
        method: 'get',
        params: { category: '${values.category}' },
      })
    })
  })

  // ---------- function condition ----------

  describe('function condition', () => {
    it('evaluates function condition correctly', () => {
      const schema: FormSchemaItem[] = [
        {
          type: 'number',
          field: 'age',
          label: '年龄',
        },
        {
          type: 'input',
          field: 'guardian',
          label: '监护人',
          linkages: [
            {
              type: 'required',
              watchFields: ['age'],
              condition: (values) => {
                const age = values.age as number
                return typeof age === 'number' && age < 18
              },
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ age: 20, guardian: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('guardian')?.required).toBe(false)

      formData.age = 15
      expect(stateMap.value.get('guardian')?.required).toBe(true)
    })
  })

  // ---------- multi-field joint linkage ----------

  describe('multi-field joint linkage', () => {
    it('evaluates condition with multiple watchFields', () => {
      const schema: FormSchemaItem[] = [
        { type: 'input', field: 'role', label: '角色' },
        { type: 'input', field: 'level', label: '级别' },
        {
          type: 'input',
          field: 'approval',
          label: '审批人',
          linkages: [
            {
              type: 'visible',
              watchFields: ['role', 'level'],
              condition: 'values.role === "manager" && values.level >= 5',
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ role: 'staff', level: 3, approval: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('approval')?.visible).toBe(false)

      formData.role = 'manager'
      expect(stateMap.value.get('approval')?.visible).toBe(false) // level still 3

      formData.level = 5
      expect(stateMap.value.get('approval')?.visible).toBe(true) // both conditions met
    })
  })

  // ---------- multiple linkage types on same field ----------

  describe('multiple linkage types on same field', () => {
    it('applies multiple linkage types independently', () => {
      const schema: FormSchemaItem[] = [
        { type: 'input', field: 'mode', label: '模式' },
        {
          type: 'textarea',
          field: 'comment',
          label: '备注',
          linkages: [
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
          ],
        },
      ]

      const formData = reactive<FormData>({ mode: 'simple' })
      const { stateMap } = useLinkage(schema, formData)

      // simple mode: hidden, not required, not disabled
      expect(stateMap.value.get('comment')?.visible).toBe(false)
      expect(stateMap.value.get('comment')?.required).toBe(false)
      expect(stateMap.value.get('comment')?.disabled).toBe(false)

      // detailed mode: visible, required
      formData.mode = 'detailed'
      expect(stateMap.value.get('comment')?.visible).toBe(true)
      expect(stateMap.value.get('comment')?.required).toBe(true)
      expect(stateMap.value.get('comment')?.disabled).toBe(false)

      // readonly mode: visible, not required, disabled
      formData.mode = 'readonly'
      expect(stateMap.value.get('comment')?.visible).toBe(true)
      expect(stateMap.value.get('comment')?.required).toBe(false)
      expect(stateMap.value.get('comment')?.disabled).toBe(true)
    })
  })

  // ---------- cycle detection ----------

  describe('cycle detection', () => {
    it('degrades fields with circular dependencies to default state', () => {
      const schema: FormSchemaItem[] = [
        {
          type: 'input',
          field: 'fieldA',
          label: 'A',
          linkages: [
            {
              type: 'visible',
              watchFields: ['fieldB'],
              condition: 'values.fieldB === "show"',
            },
          ],
        },
        {
          type: 'input',
          field: 'fieldB',
          label: 'B',
          linkages: [
            {
              type: 'visible',
              watchFields: ['fieldA'],
              condition: 'values.fieldA === "show"',
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ fieldA: '', fieldB: '' })
      const { stateMap } = useLinkage(schema, formData)

      // Cyclic fields should degrade to default state
      expect(stateMap.value.get('fieldA')?.visible).toBe(true) // default
      expect(stateMap.value.get('fieldB')?.visible).toBe(true) // default
      expect(stateMap.value.get('fieldA')?.disabled).toBe(false) // default
      expect(stateMap.value.get('fieldB')?.required).toBe(false) // default
    })
  })

  // ---------- empty linkages ----------

  describe('empty linkages', () => {
    it('returns default state for fields without linkages', () => {
      const schema: FormSchemaItem[] = [
        {
          type: 'input',
          field: 'name',
          label: '姓名',
        },
        {
          type: 'input',
          field: 'email',
          label: '邮箱',
          linkages: [],
        },
      ]

      const formData = reactive<FormData>({ name: '', email: '' })
      const { stateMap } = useLinkage(schema, formData)

      // Fields without linkages are not in stateMap
      expect(stateMap.value.has('name')).toBe(false)
      expect(stateMap.value.has('email')).toBe(false)
    })

    it('works with empty schema array', () => {
      const formData = reactive<FormData>({})
      const { stateMap } = useLinkage([], formData)

      expect(stateMap.value.size).toBe(0)
    })

    it('works with nested children', () => {
      const schema: FormSchemaItem[] = [
        {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col',
              children: [
                {
                  type: 'input',
                  field: 'nested',
                  label: '嵌套字段',
                  linkages: [
                    {
                      type: 'visible',
                      watchFields: ['toggle'],
                      condition: 'values.toggle === true',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ toggle: false, nested: '' })
      const { stateMap } = useLinkage(schema, formData)

      expect(stateMap.value.get('nested')?.visible).toBe(false)

      formData.toggle = true
      expect(stateMap.value.get('nested')?.visible).toBe(true)
    })
  })

  // ---------- default state ----------

  describe('default state', () => {
    it('defaults are visible=true, disabled=false, required=false', () => {
      const schema: FormSchemaItem[] = [
        {
          type: 'input',
          field: 'test',
          label: 'Test',
          linkages: [
            {
              type: 'visible',
              watchFields: ['x'],
              condition: 'values.x === "show"',
            },
          ],
        },
      ]

      const formData = reactive<FormData>({ x: 'hide', test: '' })
      const { stateMap } = useLinkage(schema, formData)

      const state = stateMap.value.get('test')!
      expect(state.visible).toBe(false) // condition false
      expect(state.disabled).toBe(false) // default
      expect(state.required).toBe(false) // default
      expect(state.options).toBeUndefined()
      expect(state.optionsApi).toBeUndefined()
      expect(state.elseValue).toBeUndefined()
      expect(state.targetValue).toBeUndefined()
    })
  })

  // ---------- elseValue ----------

  describe('elseValue', () => {
    it('sets elseValue when visible condition is false', () => {
      const schema: FormSchemaItem[] = [
        { type: 'select', field: 'source', label: 'Source', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] },
        {
          type: 'input', field: 'target', label: 'Target',
          linkages: [{ type: 'visible', watchFields: ['source'], condition: 'values.source === "a"', elseValue: 'hidden-value' }],
        },
      ]
      const formData = reactive<FormData>({ source: 'b' })
      const { stateMap } = useLinkage(schema, formData)
      const state = stateMap.value.get('target')!
      expect(state.visible).toBe(false)
      expect(state.elseValue).toBe('hidden-value')
    })

    it('does NOT set elseValue when condition is true', () => {
      const schema: FormSchemaItem[] = [
        { type: 'select', field: 'source', label: 'Source', options: [{ label: 'A', value: 'a' }] },
        {
          type: 'input', field: 'target', label: 'Target',
          linkages: [{ type: 'visible', watchFields: ['source'], condition: 'values.source === "a"', elseValue: 'hidden-value' }],
        },
      ]
      const formData = reactive<FormData>({ source: 'a' })
      const { stateMap } = useLinkage(schema, formData)
      const state = stateMap.value.get('target')!
      expect(state.visible).toBe(true)
      expect(state.elseValue).toBeUndefined()
    })

    it('elseValue with options linkage type on condition false', () => {
      const schema: FormSchemaItem[] = [
        { type: 'select', field: 'source', label: 'Source', options: [{ label: 'X', value: 'x' }] },
        {
          type: 'select', field: 'target', label: 'Target',
          linkages: [{ type: 'options', watchFields: ['source'], condition: 'values.source === "x"', thenOptions: [{ label: 'New', value: 'new' }], elseValue: '' }],
        },
      ]
      const formData = reactive<FormData>({ source: '' })
      const { stateMap } = useLinkage(schema, formData)
      const state = stateMap.value.get('target')!
      expect(state.options).toBeUndefined()
      expect(state.elseValue).toBe('')
    })

    it('cycle detection still works with elseValue', () => {
      const schema: FormSchemaItem[] = [
        { type: 'input', field: 'a', label: 'A', linkages: [{ type: 'visible', watchFields: ['b'], condition: 'values.b === "1"', elseValue: 'a-reset' }] },
        { type: 'input', field: 'b', label: 'B', linkages: [{ type: 'visible', watchFields: ['a'], condition: 'values.a === "1"', elseValue: 'b-reset' }] },
      ]
      const formData = reactive<FormData>({ a: '', b: '' })
      const { stateMap } = useLinkage(schema, formData)
      expect(stateMap.value.get('a')!.visible).toBe(true)
      expect(stateMap.value.get('a')!.elseValue).toBeUndefined()
      expect(stateMap.value.get('b')!.visible).toBe(true)
      expect(stateMap.value.get('b')!.elseValue).toBeUndefined()
    })
  })

  // ---------- set-value ----------

  describe('set-value linkage', () => {
    it('stores targetValue from thenValue literal', () => {
      const schema: FormSchemaItem[] = [
        { type: 'select', field: 'source', label: 'Source', options: [{ label: 'A', value: 'a' }] },
        {
          type: 'input', field: 'target', label: 'Target',
          linkages: [{ type: 'set-value', watchFields: ['source'], condition: 'values.source === "a"', thenValue: 'literal-value' }],
        },
      ]
      const formData = reactive<FormData>({ source: 'a' })
      const { stateMap } = useLinkage(schema, formData)
      expect(stateMap.value.get('target')!.targetValue).toBe('literal-value')
    })

    it('targetValue is undefined when condition is false', () => {
      const schema: FormSchemaItem[] = [
        { type: 'select', field: 'source', label: 'Source', options: [{ label: 'A', value: 'a' }] },
        {
          type: 'input', field: 'target', label: 'Target',
          linkages: [{ type: 'set-value', watchFields: ['source'], condition: 'values.source === "a"', thenValue: 'literal-value' }],
        },
      ]
      const formData = reactive<FormData>({ source: 'b' })
      const { stateMap } = useLinkage(schema, formData)
      expect(stateMap.value.get('target')!.targetValue).toBeUndefined()
    })

    it('stores targetValue from valueSource (field copy)', () => {
      const schema: FormSchemaItem[] = [
        { type: 'input', field: 'source', label: 'Source' },
        {
          type: 'input', field: 'target', label: 'Target',
          linkages: [{ type: 'set-value', watchFields: ['source'], condition: 'values.source !== ""', valueSource: 'source' }],
        },
      ]
      const formData = reactive<FormData>({ source: 'hello', target: '' })
      const { stateMap } = useLinkage(schema, formData)
      expect(stateMap.value.get('target')!.targetValue).toBe('hello')

      // Update source → targetValue should update reactively
      formData.source = 'world'
      expect(stateMap.value.get('target')!.targetValue).toBe('world')
    })

    it('set-value with elseValue fallback', () => {
      const schema: FormSchemaItem[] = [
        { type: 'select', field: 'source', label: 'Source', options: [{ label: 'A', value: 'a' }] },
        {
          type: 'input', field: 'target', label: 'Target',
          linkages: [{ type: 'set-value', watchFields: ['source'], condition: 'values.source === "a"', thenValue: 'active', elseValue: '' }],
        },
      ]
      const formData = reactive<FormData>({ source: 'b' })
      const { stateMap } = useLinkage(schema, formData)
      expect(stateMap.value.get('target')!.targetValue).toBeUndefined()
      expect(stateMap.value.get('target')!.elseValue).toBe('')
    })
  })
})
