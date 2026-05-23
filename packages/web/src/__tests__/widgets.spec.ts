/**
 * Widget unit tests
 *
 * Comprehensive tests covering:
 * - Widget Loading: registry returns valid components for all 17 widget types
 * - Widget Config Validation: each config.ts has required fields
 * - Widget Default Schema: createDefaultSchema() generates valid objects
 * - Rule Engine: computeWidgetRenderState() returns correct states
 * - Widget Store CRUD: addWidget, removeWidget, updateWidget, findWidget, moveWidget
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Widget, SchemaType as WidgetSchemaType } from '@/widgets/base/types'
import type { SchemaType } from '@/components/WidgetRenderer/types'

// --- Registry & Config ---
import { registerAllWidgets } from '@/widgets/index'
import { getAllWidgets, getWidget, getComponentMap, createWidget, getWidgetsByGroup } from '@/widgets/registry'

// --- Individual configs ---
import { formConfig } from '@/widgets/form/config'
import { cardConfig } from '@/widgets/card/config'
import { rowColConfig } from '@/widgets/row-col/config'
import { tabsConfig } from '@/widgets/tabs/config'
import { dialogConfig } from '@/widgets/dialog/config'
import { inputConfig } from '@/widgets/input/config'
import { selectConfig } from '@/widgets/select/config'
import { numberConfig } from '@/widgets/number/config'
import { radioConfig } from '@/widgets/radio/config'
import { checkboxConfig } from '@/widgets/checkbox/config'
import { dateConfig } from '@/widgets/date/config'
import { textareaConfig } from '@/widgets/textarea/config'
import { buttonListConfig } from '@/widgets/button-list/config'
import { titleConfig } from '@/widgets/title/config'
import { dividerConfig } from '@/widgets/divider/config'
import { spacerConfig } from '@/widgets/spacer/config'
import { toolbarButtonsConfig } from '@/widgets/toolbar-buttons/config'
import { tableConfig } from '@/widgets/table/config'
import { buttonConfig } from '@/widgets/button/config'
import { richtextConfig } from '@/widgets/richtext/config'
import { uploadConfig } from '@/widgets/upload/config'
import { bannerConfig } from '@/widgets/banner/config'
import { treeLayoutConfig } from '@/widgets/tree-layout/config'
import { dateTimeSlotConfig } from '@/widgets/date-time-slot/config'
import { fileListConfig } from '@/widgets/file-list/config'
import { transferConfig } from '@/widgets/transfer/config'
import { detailFormConfig } from '@/widgets/detail-form/config'
import { searchListConfig } from '@/widgets/search-list/config'
import { editableTableConfig } from '@/widgets/editable-table/config'

// --- createDefaultSchema ---
import { createDefaultSchema } from '@/utils/schemaDefaults'

// --- Rule engine ---
import { computeWidgetRenderState } from '@/__tests__/widgetTestHarness'

// --- Widget store ---
import { useWidgetStore } from '@/stores/widget'

// --- Public schema helpers ---
import { publicStylePanel } from '@/widgets/base/publicSchema'

// =====================================================================
// Expected registered widget types
// =====================================================================
const REGISTERED_TYPES: WidgetSchemaType[] = [
  'form', 'card', 'row-col', 'tabs', 'dialog',
  'input', 'select', 'number', 'radio', 'checkbox',
  'date', 'textarea', 'button-list', 'title', 'divider',
  'spacer', 'toolbar-buttons', 'table', 'button',
  'richtext', 'upload', 'banner', 'tree-layout', 'date-time-slot',
  'file-list', 'transfer',
  'detail-form', 'search-list', 'editable-table',
]

const ALL_CONFIGS = [
  { name: 'form', config: formConfig },
  { name: 'card', config: cardConfig },
  { name: 'row-col', config: rowColConfig },
  { name: 'tabs', config: tabsConfig },
  { name: 'dialog', config: dialogConfig },
  { name: 'input', config: inputConfig },
  { name: 'select', config: selectConfig },
  { name: 'number', config: numberConfig },
  { name: 'radio', config: radioConfig },
  { name: 'checkbox', config: checkboxConfig },
  { name: 'date', config: dateConfig },
  { name: 'textarea', config: textareaConfig },
  { name: 'button-list', config: buttonListConfig },
  { name: 'title', config: titleConfig },
  { name: 'divider', config: dividerConfig },
  { name: 'spacer', config: spacerConfig },
  { name: 'toolbar-buttons', config: toolbarButtonsConfig },
  { name: 'table', config: tableConfig },
  { name: 'button', config: buttonConfig },
  { name: 'richtext', config: richtextConfig },
  { name: 'upload', config: uploadConfig },
  { name: 'banner', config: bannerConfig },
  { name: 'tree-layout', config: treeLayoutConfig },
  { name: 'date-time-slot', config: dateTimeSlotConfig },
  { name: 'file-list', config: fileListConfig },
  { name: 'transfer', config: transferConfig },
  { name: 'detail-form', config: detailFormConfig },
  { name: 'search-list', config: searchListConfig },
  { name: 'editable-table', config: editableTableConfig },
]

// =====================================================================
// Tests
// =====================================================================

describe('Widget Registry & Loading', () => {
  beforeEach(() => {
    // registerAllWidgets is idempotent — Map.set replaces existing entries
    registerAllWidgets()
  })

  it('registers exactly 29 widget types', () => {
    const all = getAllWidgets()
    expect(all).toHaveLength(29)
  })

  it('getComponentMap returns a component for every registered type', () => {
    const compMap = getComponentMap()
    for (const type of REGISTERED_TYPES) {
      expect(compMap[type], `compMap should have entry for type "${type}"`).toBeDefined()
      expect(typeof compMap[type], `compMap["${type}"] should be a component (object/function)`).toBe('object')
    }
  })

  it('getWidget returns the correct entry for each type', () => {
    for (const type of REGISTERED_TYPES) {
      const entry = getWidget(type)
      expect(entry, `getWidget("${type}") should exist`).toBeDefined()
      expect(entry!.type).toBe(type)
      expect(typeof entry!.component).toBe('object')
      expect(typeof entry!.create).toBe('function')
      expect(entry!.config).toBeDefined()
    }
  })

  it('createWidget returns a valid Widget for each type', () => {
    for (const type of REGISTERED_TYPES) {
      const widget = createWidget(type, `test_${type}_001`)
      expect(widget, `createWidget("${type}") should not be null`).not.toBeNull()
      expect(widget!.id).toBe(`test_${type}_001`)
      expect(widget!.type).toBe(type)
      expect(widget!.position).toBeDefined()
      expect(typeof widget!.position.x).toBe('number')
      expect(typeof widget!.position.y).toBe('number')
      expect(typeof widget!.position.w).toBe('number')
      expect(typeof widget!.position.h).toBe('number')
    }
  })

  it('createWidget returns null for unknown type', () => {
    const widget = createWidget('unknown-type' as WidgetSchemaType, 'test_unknown')
    expect(widget).toBeNull()
  })

  it('getWidgetsByGroup correctly filters by group', () => {
    const containers = getWidgetsByGroup('container')
    expect(containers.length).toBeGreaterThanOrEqual(1)
    for (const w of containers) {
      expect(w.group).toBe('container')
    }

    const basics = getWidgetsByGroup('basic')
    expect(basics.length).toBeGreaterThanOrEqual(1)
    for (const w of basics) {
      expect(w.group).toBe('basic')
    }
  })

  it('all registered types are represented in REGISTERED_TYPES', () => {
    const all = getAllWidgets()
    const registeredTypes = all.map(w => w.type)
    for (const t of REGISTERED_TYPES) {
      expect(registeredTypes).toContain(t)
    }
  })
})

// =====================================================================
// Widget Config Validation
// =====================================================================

describe('Widget Config Validation', () => {
  for (const { name, config } of ALL_CONFIGS) {
    describe(`${name} config`, () => {
      it('has name (string)', () => {
        expect(typeof config.name).toBe('string')
        expect((config.name as string).length).toBeGreaterThan(0)
      })

      it('has displayName (string)', () => {
        expect(typeof config.displayName).toBe('string')
        expect((config.displayName as string).length).toBeGreaterThan(0)
      })

      it('has description (string)', () => {
        expect(typeof config.description).toBe('string')
        expect((config.description as string).length).toBeGreaterThan(0)
      })

      it('has propertyPanel with basic, style, and props arrays', () => {
        expect(config.propertyPanel).toBeDefined()
        expect(Array.isArray((config.propertyPanel as any).basic)).toBe(true)
        expect(Array.isArray((config.propertyPanel as any).style)).toBe(true)
        expect(Array.isArray((config.propertyPanel as any).props)).toBe(true)
      })

      it('has defaultStyle (object)', () => {
        expect(config.defaultStyle).toBeDefined()
        expect(typeof config.defaultStyle).toBe('object')
      })

      it('has defaultProps (object)', () => {
        expect(config.defaultProps).toBeDefined()
        expect(typeof config.defaultProps).toBe('object')
      })
    })
  }

  it('input config.propertyPanel.basic contains field, label, defaultValue', () => {
    const basic = (inputConfig.propertyPanel as any).basic
    expect(basic).toContain('field')
    expect(basic).toContain('label')
    expect(basic).toContain('defaultValue')
  })

  it('input config.propertyPanel.props has placeholder entry', () => {
    const props = (inputConfig.propertyPanel as any).props
    const placeholder = props.find((p: any) => p.key === 'placeholder')
    expect(placeholder).toBeDefined()
    expect(placeholder.type).toBe('input')
  })

  it('select config.propertyPanel.basic contains options', () => {
    const basic = (selectConfig.propertyPanel as any).basic
    expect(basic).toContain('options')
  })

  it('card config.propertyPanel.basic has title/shadow/showHeader entries', () => {
    const basic = (cardConfig.propertyPanel as any).basic
    const keys = basic.map((b: any) => b.key)
    expect(keys).toContain('title')
    expect(keys).toContain('shadow')
    expect(keys).toContain('showHeader')
  })

  it('publicStylePanel contains standard style keys', () => {
    expect(publicStylePanel).toContain('margin')
    expect(publicStylePanel).toContain('padding')
    expect(publicStylePanel).toContain('backgroundColor')
    expect(publicStylePanel).toContain('borderRadius')
    expect(publicStylePanel).toContain('fontSize')
    expect(publicStylePanel).toContain('color')
  })
})

// =====================================================================
// Widget Default Schema (createDefaultSchema from schemaDefaults)
// =====================================================================

describe('Widget Default Schema', () => {
  const formComponentTypes: SchemaType[] = [
    'input', 'number', 'select', 'radio', 'checkbox',
    'date', 'textarea', 'richtext', 'upload', 'date-time-slot',
    'editable-table',
  ]

  const layoutTypes: SchemaType[] = [
    'grid-row', 'grid-col', 'card', 'page', 'toolbar',
    'title', 'divider', 'spacer', 'steps', 'tabs', 'dialog',
    'tree-layout', 'detail-form',
  ]

  const noFieldTypes: SchemaType[] = [
    'banner', 'file-list', 'transfer',
  ]

  for (const type of formComponentTypes) {
    describe(`type="${type}"`, () => {
      it('creates a valid schema with type and field', () => {
        const schema = createDefaultSchema(type)
        expect(schema.type).toBe(type)
        expect(schema.field).toBeDefined()
        expect(typeof schema.field).toBe('string')
        expect(schema.field!.length).toBeGreaterThan(0)
      })

      it('generates unique field names on each call', () => {
        const s1 = createDefaultSchema(type)
        const s2 = createDefaultSchema(type)
        expect(s1.field).not.toBe(s2.field)
      })
    })
  }

  for (const type of layoutTypes) {
    describe(`type="${type}"`, () => {
      it('creates a valid schema with correct type', () => {
        const schema = createDefaultSchema(type)
        expect(schema.type).toBe(type)
      })
    })
  }

  for (const type of noFieldTypes) {
    describe(`type="${type}"`, () => {
      it('creates a valid schema with correct type and no field', () => {
        const schema = createDefaultSchema(type)
        expect(schema.type).toBe(type)
        expect(schema.field).toBeUndefined()
      })
    })
  }

  it('grid-row has children array', () => {
    const schema = createDefaultSchema('grid-row')
    expect(Array.isArray(schema.children)).toBe(true)
    expect(schema.children).toHaveLength(0)
  })

  it('grid-col has span and children', () => {
    const schema = createDefaultSchema('grid-col')
    expect(schema.span).toBe(12)
    expect(Array.isArray(schema.children)).toBe(true)
  })

  it('card has label, children, and style', () => {
    const schema = createDefaultSchema('card')
    expect(schema.label).toBe('Card')
    expect(Array.isArray(schema.children)).toBe(true)
    expect(schema.style).toBeDefined()
    expect(schema.style!.padding).toBeDefined()
  })

  it('select has options', () => {
    const schema = createDefaultSchema('select')
    expect(schema.options).toBeDefined()
    expect(schema.options!.length).toBeGreaterThanOrEqual(2)
    expect(schema.options![0]).toHaveProperty('label')
    expect(schema.options![0]).toHaveProperty('value')
  })

  it('radio has options', () => {
    const schema = createDefaultSchema('radio')
    expect(schema.options).toBeDefined()
    expect(schema.options!.length).toBeGreaterThanOrEqual(2)
  })

  it('checkbox has options', () => {
    const schema = createDefaultSchema('checkbox')
    expect(schema.options).toBeDefined()
    expect(schema.options!.length).toBeGreaterThanOrEqual(2)
  })

  it('button-list has buttons array with submit and reset', () => {
    const schema = createDefaultSchema('button-list')
    expect(schema.type).toBe('button-list')
    expect(schema.buttons).toBeDefined()
    expect(schema.buttons!.length).toBeGreaterThanOrEqual(2)
    const texts = schema.buttons!.map(b => b.text)
    expect(texts).toContain('Submit')
    expect(texts).toContain('Reset')
  })

  it('input schema has label and props', () => {
    const schema = createDefaultSchema('input')
    expect(schema.label).toBeDefined()
    expect(schema.props).toBeDefined()
    expect(schema.props!.placeholder).toBeDefined()
  })

  it('tabs has props with tabs array and children', () => {
    const schema = createDefaultSchema('tabs')
    expect(schema.props).toBeDefined()
    expect(schema.props!.tabs).toBeDefined()
    expect(Array.isArray(schema.children)).toBe(true)
  })

  it('dialog has props with title and width', () => {
    const schema = createDefaultSchema('dialog')
    expect(schema.props).toBeDefined()
    expect(schema.props!.title).toBeDefined()
    expect(schema.props!.width).toBeDefined()
    expect(Array.isArray(schema.children)).toBe(true)
  })

  it('search-list has comprehensive default structure', () => {
    const schema = createDefaultSchema('search-list')
    expect(schema.type).toBe('search-list')
    expect(schema.listApi).toBeDefined()
    expect(schema.listApi!.url).toBe('/api/list')
    expect(schema.searchFields).toBeDefined()
    expect(schema.searchFields!.length).toBeGreaterThan(0)
    expect(schema.columns).toBeDefined()
    expect(schema.columns!.length).toBeGreaterThan(0)
    expect(schema.rowActions).toBeDefined()
    expect(schema.buttons).toBeDefined()
  })

  it('banner has props with text, type, closable', () => {
    const schema = createDefaultSchema('banner')
    expect(schema.type).toBe('banner')
    expect(schema.props).toBeDefined()
    expect(schema.props!.text).toBe('提示信息')
    expect(schema.props!.type).toBe('info')
    expect(schema.props!.closable).toBe(true)
  })

  it('tree-layout has children and props', () => {
    const schema = createDefaultSchema('tree-layout')
    expect(schema.type).toBe('tree-layout')
    expect(schema.props!.title).toBe('树形布局')
    expect(schema.props!.showSearch).toBe(true)
    expect(Array.isArray(schema.children)).toBe(true)
  })

  it('date-time-slot has field and props', () => {
    const schema = createDefaultSchema('date-time-slot')
    expect(schema.type).toBe('date-time-slot')
    expect(schema.field).toBeDefined()
    expect(schema.props!.startPlaceholder).toBe('开始时间')
    expect(schema.props!.endPlaceholder).toBe('结束时间')
    expect(schema.props!.format).toBe('YYYY-MM-DD HH:mm:ss')
  })

  it('file-list has props with title and permissions', () => {
    const schema = createDefaultSchema('file-list')
    expect(schema.type).toBe('file-list')
    expect(schema.props!.title).toBe('附件')
    expect(schema.props!.allowDelete).toBe(true)
    expect(schema.props!.allowPreview).toBe(true)
  })

  it('transfer has props with titles and filterable', () => {
    const schema = createDefaultSchema('transfer')
    expect(schema.type).toBe('transfer')
    expect(schema.props!.titles).toEqual(['待选', '已选'])
    expect(schema.props!.filterable).toBe(true)
  })

  it('detail-form has children and props', () => {
    const schema = createDefaultSchema('detail-form')
    expect(schema.type).toBe('detail-form')
    expect(schema.props!.title).toBe('详情')
    expect(schema.props!.columns).toBe(2)
    expect(schema.props!.bordered).toBe(true)
    expect(Array.isArray(schema.children)).toBe(true)
  })

  it('editable-table has field and props', () => {
    const schema = createDefaultSchema('editable-table')
    expect(schema.type).toBe('editable-table')
    expect(schema.field).toBeDefined()
    expect(schema.props!.title).toBe('可编辑表格')
    expect(schema.props!.showAddButton).toBe(true)
    expect(schema.props!.showDeleteButton).toBe(true)
    expect(schema.props!.maxRows).toBe(0)
  })
})

// =====================================================================
// Rule Engine: computeWidgetRenderState
// =====================================================================

describe('Rule Engine: computeWidgetRenderState', () => {
  function makeWidget(overrides: Partial<Widget> = {}): Widget {
    return {
      id: 'test-widget-001',
      name: 'FgInput',
      type: 'input',
      position: { x: 0, y: 0, w: 240, h: 40 },
      props: {},
      ...overrides,
    }
  }

  it('returns visible=true for a normal widget with no rules', () => {
    const widget = makeWidget()
    const state = computeWidgetRenderState(widget, {})
    expect(state.visible).toBe(true)
    expect(state.disabled).toBe(false)
    expect(state.required).toBe(false)
  })

  it('returns visible=false when widget.hidden is true', () => {
    const widget = makeWidget({ hidden: true })
    const state = computeWidgetRenderState(widget, {})
    expect(state.visible).toBe(false)
  })

  it('returns disabled=true when widget.props.disabled is true', () => {
    const widget = makeWidget({ props: { disabled: true } })
    const state = computeWidgetRenderState(widget, {})
    expect(state.disabled).toBe(true)
  })

  it('returns required=true when validationRules has required: true', () => {
    const widget = makeWidget({
      validationRules: [{ required: true, message: 'Required field' }],
    })
    const state = computeWidgetRenderState(widget, {})
    expect(state.required).toBe(true)
  })

  it('returns required=false when validationRules has no required rule', () => {
    const widget = makeWidget({
      validationRules: [{ min: 3, message: 'Too short' }],
    })
    const state = computeWidgetRenderState(widget, {})
    expect(state.required).toBe(false)
  })

  it('executes hide rule when condition matches', () => {
    const widget = makeWidget({
      rules: [{
        watches: [{ type: 'field', source: 'status' }],
        condition: 'status === "inactive"',
        actions: [{ type: 'hide', config: {} }],
      }],
    })
    const state = computeWidgetRenderState(widget, { status: 'inactive' })
    expect(state.visible).toBe(false)
  })

  it('does not execute hide rule when condition does not match', () => {
    const widget = makeWidget({
      rules: [{
        watches: [{ type: 'field', source: 'status' }],
        condition: 'status === "inactive"',
        actions: [{ type: 'hide', config: {} }],
      }],
    })
    const state = computeWidgetRenderState(widget, { status: 'active' })
    expect(state.visible).toBe(true)
  })

  it('executes visible rule when condition matches', () => {
    const widget = makeWidget({
      hidden: true,
      rules: [{
        watches: [{ type: 'field', source: 'show' }],
        condition: 'show === true',
        actions: [{ type: 'visible', config: {} }],
      }],
    })
    // hidden starts as true, but visible rule overrides it
    const state = computeWidgetRenderState(widget, { show: true })
    expect(state.visible).toBe(true)
  })

  it('executes disabled rule when condition matches', () => {
    const widget = makeWidget({
      rules: [{
        watches: [{ type: 'field', source: 'lock' }],
        condition: 'lock === true',
        actions: [{ type: 'disabled', config: {} }],
      }],
    })
    const state = computeWidgetRenderState(widget, { lock: true })
    expect(state.disabled).toBe(true)
  })

  it('does not execute rules when watch field is not in formData', () => {
    const widget = makeWidget({
      rules: [{
        watches: [{ type: 'field', source: 'missingField' }],
        condition: 'missingField === "x"',
        actions: [{ type: 'hide', config: {} }],
      }],
    })
    const state = computeWidgetRenderState(widget, {})
    expect(state.visible).toBe(true)
  })

  it('handles multiple rules correctly', () => {
    const widget = makeWidget({
      rules: [
        {
          watches: [{ type: 'field', source: 'a' }],
          condition: 'a === 1',
          actions: [{ type: 'disabled', config: {} }],
        },
        {
          watches: [{ type: 'field', source: 'b' }],
          condition: 'b === 2',
          actions: [{ type: 'hide', config: {} }],
        },
      ],
    })
    // Only first rule matches
    const state1 = computeWidgetRenderState(widget, { a: 1, b: 0 })
    expect(state1.disabled).toBe(true)
    expect(state1.visible).toBe(true)

    // Only second rule matches
    const state2 = computeWidgetRenderState(widget, { a: 0, b: 2 })
    expect(state2.disabled).toBe(false)
    expect(state2.visible).toBe(false)

    // Both rules match
    const state3 = computeWidgetRenderState(widget, { a: 1, b: 2 })
    expect(state3.disabled).toBe(true)
    expect(state3.visible).toBe(false)
  })

  it('handles empty rules array same as no rules', () => {
    const widget = makeWidget({ rules: [] })
    const state = computeWidgetRenderState(widget, {})
    expect(state.visible).toBe(true)
    expect(state.disabled).toBe(false)
    expect(state.required).toBe(false)
  })

  it('handles malformed condition gracefully (returns false)', () => {
    const widget = makeWidget({
      rules: [{
        watches: [{ type: 'field', source: 'x' }],
        condition: 'invalid syntax !!!',
        actions: [{ type: 'hide', config: {} }],
      }],
    })
    // Should not throw — evaluateCondition catches errors and returns false
    const state = computeWidgetRenderState(widget, { x: 1 })
    expect(state.visible).toBe(true)
  })
})

// =====================================================================
// Widget Store CRUD
// =====================================================================

describe('Widget Store CRUD', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useWidgetStore()
  })

  function makeWidget(id: string, type: WidgetSchemaType = 'input', overrides: Partial<Widget> = {}): Widget {
    return {
      id,
      name: `Fg${type}`,
      type,
      position: { x: 0, y: 0, w: 240, h: 40, zIndex: 1 },
      props: {},
      ...overrides,
    }
  }

  // --- addWidget ---

  it('addWidget adds a widget to the store', () => {
    const widget = makeWidget('w1')
    store.addWidget(widget)
    expect(store.widgets).toHaveLength(1)
    expect(store.widgets[0].id).toBe('w1')
  })

  it('addWidget sets zIndex to max + 1', () => {
    store.addWidget(makeWidget('w1'))
    store.widgets[0].position.zIndex = 5
    store.addWidget(makeWidget('w2'))
    expect(store.widgets[1].position.zIndex).toBe(6)
  })

  it('addWidget multiple widgets accumulates correctly', () => {
    store.addWidget(makeWidget('w1'))
    store.addWidget(makeWidget('w2'))
    store.addWidget(makeWidget('w3'))
    expect(store.widgets).toHaveLength(3)
  })

  // --- findWidget ---

  it('findWidget returns the correct widget by id', () => {
    store.addWidget(makeWidget('w1'))
    store.addWidget(makeWidget('w2'))
    const found = store.findWidget('w2')
    expect(found).not.toBeNull()
    expect(found!.id).toBe('w2')
  })

  it('findWidget returns null for non-existent id', () => {
    store.addWidget(makeWidget('w1'))
    expect(store.findWidget('nonexistent')).toBeNull()
  })

  it('findWidget finds nested children', () => {
    const child = makeWidget('child1')
    const parent = makeWidget('parent1', 'card', { children: [child] })
    store.addWidget(parent)

    const found = store.findWidget('child1')
    expect(found).not.toBeNull()
    expect(found!.id).toBe('child1')
  })

  // --- removeWidget ---

  it('removeWidget removes a root-level widget', () => {
    store.addWidget(makeWidget('w1'))
    store.addWidget(makeWidget('w2'))
    store.removeWidget('w1')
    expect(store.widgets).toHaveLength(1)
    expect(store.widgets[0].id).toBe('w2')
  })

  it('removeWidget removes a nested widget', () => {
    const child = makeWidget('child1')
    const parent = makeWidget('parent1', 'card', { children: [child] })
    store.addWidget(parent)

    store.removeWidget('child1')
    const foundParent = store.findWidget('parent1')
    expect(foundParent!.children).toHaveLength(0)
  })

  it('removeWidget does nothing for non-existent id', () => {
    store.addWidget(makeWidget('w1'))
    store.removeWidget('nonexistent')
    expect(store.widgets).toHaveLength(1)
  })

  // --- updateWidget ---

  it('updateWidget patches the widget', () => {
    store.addWidget(makeWidget('w1'))
    store.updateWidget('w1', { label: 'Updated Label' })
    const found = store.findWidget('w1')
    expect(found!.label).toBe('Updated Label')
  })

  it('updateWidget patches nested props', () => {
    store.addWidget(makeWidget('w1', 'input', { props: { placeholder: 'old' } }))
    store.updateWidget('w1', { props: { placeholder: 'new', clearable: true } })
    const found = store.findWidget('w1')
    expect(found!.props!.placeholder).toBe('new')
    expect(found!.props!.clearable).toBe(true)
  })

  it('updateWidget does nothing for non-existent id', () => {
    store.addWidget(makeWidget('w1'))
    store.updateWidget('nonexistent', { label: 'test' })
    expect(store.findWidget('w1')!.label).toBeUndefined()
  })

  // --- moveWidget ---

  it('moveWidget updates x and y', () => {
    store.addWidget(makeWidget('w1'))
    store.moveWidget('w1', 100, 200)
    const found = store.findWidget('w1')
    expect(found!.position.x).toBe(100)
    expect(found!.position.y).toBe(200)
  })

  it('moveWidget does not change w and h', () => {
    store.addWidget(makeWidget('w1'))
    store.moveWidget('w1', 50, 50)
    const found = store.findWidget('w1')
    expect(found!.position.w).toBe(240)
    expect(found!.position.h).toBe(40)
  })

  it('moveWidget does nothing for non-existent id', () => {
    store.addWidget(makeWidget('w1'))
    store.moveWidget('nonexistent', 99, 99)
    expect(store.findWidget('w1')!.position.x).toBe(0)
  })

  // --- resizeWidget ---

  it('resizeWidget updates w and h', () => {
    store.addWidget(makeWidget('w1'))
    store.resizeWidget('w1', 500, 300)
    const found = store.findWidget('w1')
    expect(found!.position.w).toBe(500)
    expect(found!.position.h).toBe(300)
  })

  it('resizeWidget enforces minimum size of 20', () => {
    store.addWidget(makeWidget('w1'))
    store.resizeWidget('w1', 5, 10)
    const found = store.findWidget('w1')
    expect(found!.position.w).toBe(20)
    expect(found!.position.h).toBe(20)
  })

  // --- setZIndex ---

  it('setZIndex updates zIndex', () => {
    store.addWidget(makeWidget('w1'))
    store.setZIndex('w1', 10)
    expect(store.findWidget('w1')!.position.zIndex).toBe(10)
  })

  it('setZIndex enforces minimum of 1', () => {
    store.addWidget(makeWidget('w1'))
    store.setZIndex('w1', 0)
    expect(store.findWidget('w1')!.position.zIndex).toBe(1)
  })

  // --- findParent ---

  it('findParent returns null for root widget', () => {
    store.addWidget(makeWidget('w1'))
    expect(store.findParent('w1')).toBeNull()
  })

  it('findParent returns parent for nested widget', () => {
    const child = makeWidget('child1')
    const parent = makeWidget('parent1', 'card', { children: [child] })
    store.addWidget(parent)

    const foundParent = store.findParent('child1')
    expect(foundParent).not.toBeNull()
    expect(foundParent!.id).toBe('parent1')
  })

  // --- isRootWidget ---

  it('isRootWidget returns true for root-level widget', () => {
    store.addWidget(makeWidget('w1'))
    expect(store.isRootWidget('w1')).toBe(true)
  })

  it('isRootWidget returns false for nested widget', () => {
    const child = makeWidget('child1')
    const parent = makeWidget('parent1', 'card', { children: [child] })
    store.addWidget(parent)
    expect(store.isRootWidget('child1')).toBe(false)
  })

  // --- addToContainer ---

  it('addToContainer moves widget into container', () => {
    store.addWidget(makeWidget('w1', 'input'))
    store.addWidget(makeWidget('c1', 'card'))
    store.addToContainer('w1', 'c1')

    expect(store.widgets).toHaveLength(1) // only container at root
    const container = store.findWidget('c1')
    expect(container!.children).toHaveLength(1)
    expect(container!.children![0].id).toBe('w1')
  })

  it('addToContainer prevents self-parenting', () => {
    store.addWidget(makeWidget('c1', 'card'))
    store.addToContainer('c1', 'c1')
    expect(store.widgets).toHaveLength(1)
    expect(store.findWidget('c1')!.children).toBeUndefined()
  })

  // --- removeFromContainer ---

  it('removeFromContainer moves widget back to root', () => {
    const child = makeWidget('child1')
    const parent = makeWidget('parent1', 'card', { children: [child] })
    store.addWidget(parent)

    store.removeFromContainer('child1')
    expect(store.widgets).toHaveLength(2)
    expect(store.isRootWidget('child1')).toBe(true)
  })

  // --- reparentToRoot ---

  it('reparentToRoot moves nested widget to root', () => {
    const child = makeWidget('child1')
    const parent = makeWidget('parent1', 'card', { children: [child] })
    store.addWidget(parent)

    store.reparentToRoot('child1')
    expect(store.isRootWidget('child1')).toBe(true)
    expect(store.findWidget('parent1')!.children).toHaveLength(0)
  })

  it('reparentToRoot does nothing for already-root widget', () => {
    store.addWidget(makeWidget('w1'))
    store.reparentToRoot('w1')
    expect(store.widgets).toHaveLength(1)
  })

  // --- reparentToContainer ---

  it('reparentToContainer moves widget to target container', () => {
    store.addWidget(makeWidget('w1', 'input'))
    store.addWidget(makeWidget('c1', 'card'))
    store.reparentToContainer('w1', 'c1', 50, 100)

    expect(store.widgets).toHaveLength(1)
    const container = store.findWidget('c1')
    expect(container!.children).toHaveLength(1)
    expect(container!.children![0].id).toBe('w1')
    expect(container!.children![0].position.x).toBe(50)
    expect(container!.children![0].position.y).toBe(100)
  })

  it('reparentToContainer prevents self-parenting', () => {
    store.addWidget(makeWidget('c1', 'card'))
    store.reparentToContainer('c1', 'c1', 0, 0)
    expect(store.widgets).toHaveLength(1)
  })

  // --- collectFormValues ---

  it('collectFormValues collects field values from bound widgets', () => {
    store.addWidget(makeWidget('w1', 'input', { field: 'name', defaultValue: 'Alice', formId: 'form1' }))
    store.addWidget(makeWidget('w2', 'number', { field: 'age', defaultValue: 30, formId: 'form1' }))
    store.addWidget(makeWidget('w3', 'input', { field: 'other', defaultValue: 'x', formId: 'form2' }))

    const values = store.collectFormValues('form1')
    expect(values).toEqual({ name: 'Alice', age: 30 })
  })

  it('collectFormValues returns empty object for no matching formId', () => {
    store.addWidget(makeWidget('w1', 'input', { field: 'name', formId: 'form1' }))
    const values = store.collectFormValues('nonexistent')
    expect(values).toEqual({})
  })

  // --- bindToForm / unbindFromForm ---

  it('bindToForm sets formId on widget', () => {
    store.addWidget(makeWidget('w1'))
    store.bindToForm('w1', 'form1')
    expect(store.findWidget('w1')!.formId).toBe('form1')
  })

  it('unbindFromForm removes formId from widget', () => {
    store.addWidget(makeWidget('w1', 'input', { formId: 'form1' }))
    store.unbindFromForm('w1')
    expect(store.findWidget('w1')!.formId).toBeUndefined()
  })

  // --- setTabKey / setColIndex ---

  it('setTabKey sets tabKey on widget', () => {
    store.addWidget(makeWidget('w1'))
    store.setTabKey('w1', 'tab2')
    expect(store.findWidget('w1')!.tabKey).toBe('tab2')
  })

  it('setColIndex sets colIndex on widget', () => {
    store.addWidget(makeWidget('w1'))
    store.setColIndex('w1', 3)
    expect(store.findWidget('w1')!.colIndex).toBe(3)
  })

  // --- loadWidgets / clearWidgets ---

  it('loadWidgets replaces all widgets', () => {
    store.addWidget(makeWidget('w1'))
    store.loadWidgets([makeWidget('w2'), makeWidget('w3')])
    expect(store.widgets).toHaveLength(2)
    expect(store.widgets[0].id).toBe('w2')
  })

  it('clearWidgets empties the store', () => {
    store.addWidget(makeWidget('w1'))
    store.addWidget(makeWidget('w2'))
    store.clearWidgets()
    expect(store.widgets).toHaveLength(0)
  })

})
