/**
 * schemaDefaults — Default FormSchemaItem factory for each component type
 *
 * Extracted from EditorCanvas.vue createDefaultSchema() so it can be shared
 * between the editor store and editor canvas component.
 */
import type { FormSchemaItem, SchemaType } from '@/components/FormGrid/types'
import { isFullWidthType } from '@/components/FormGrid/types'

/**
 * Create a default FormSchemaItem for a given component type.
 *
 * Used when dragging from the component panel onto the canvas.
 * Returns a fully initialized schema item with sensible defaults.
 */
export function createDefaultSchema(type: SchemaType): FormSchemaItem {
  // ---- Layout types ----
  if (type === 'grid-row') {
    return { type: 'grid-row', children: [], style: { height: '44px' } }
  }
  if (type === 'grid-col') {
    return { type: 'grid-col', span: 12, children: [], style: { height: '44px' } }
  }
  if (type === 'card') {
    return { type: 'card', label: 'Card', children: [], style: { padding: '16px', borderRadius: '4px' } }
  }
  if (type === 'page') {
    return { type: 'page', children: [], style: { padding: '24px' } }
  }
  if (type === 'toolbar') {
    return { type: 'toolbar', children: [], style: { padding: '8px 16px' } }
  }
  if (type === 'title') {
    return { type: 'title', label: 'Title' }
  }
  if (type === 'divider') {
    return { type: 'divider' }
  }
  if (type === 'spacer') {
    return { type: 'spacer' }
  }
  if (type === 'steps') {
    return {
      type: 'steps',
      props: {
        steps: [{ title: 'Step 1' }, { title: 'Step 2' }],
      },
      children: [
        { type: 'grid-row', children: [] },
        { type: 'grid-row', children: [] },
      ],
    }
  }
  if (type === 'tabs') {
    return {
      type: 'tabs',
      props: { tabs: [{ title: 'Tab 1' }] },
      children: [{ type: 'grid-row', children: [] }],
    }
  }
  if (type === 'dialog') {
    return {
      type: 'dialog',
      label: 'Dialog',
      props: { title: 'Dialog', width: '600px' },
      children: [],
    }
  }

  // ---- Form components: generate a unique field name ----
  const field = `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const base: FormSchemaItem = { type, field }

  let item: FormSchemaItem

  switch (type) {
    case 'input':
    case 'textarea':
      item = { ...base, label: 'Input', props: { placeholder: 'Please enter' }, style: { width: '100%', height: '44px' } }
      break
    case 'number':
      item = { ...base, label: 'Number', props: { placeholder: 'Please enter' }, style: { width: '100%', height: '44px' } }
      break
    case 'select':
      item = {
        ...base,
        label: 'Select',
        options: [
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' },
        ],
        style: { width: '100%', height: '44px' },
      }
      break
    case 'radio':
      item = {
        ...base,
        label: 'Radio',
        options: [
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' },
        ],
        style: { width: '100%', height: '44px' },
      }
      break
    case 'checkbox':
      item = {
        ...base,
        label: 'Checkbox',
        options: [
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' },
        ],
        style: { width: '100%', height: '44px' },
      }
      break
    case 'date':
      item = { ...base, label: 'Date', style: { width: '100%', height: '44px' } }
      break
    case 'date-range':
      item = { ...base, label: 'Date Range', style: { width: '100%', height: '44px' } }
      break
    case 'button-list':
      item = {
        type: 'button-list',
        buttons: [
          { text: 'Submit', buttonType: 'primary', actions: [{ type: 'submit' }] },
          { text: 'Reset', actions: [{ type: 'reset' }] },
        ],
      }
      break
    case 'upload':
      item = { ...base, label: 'Upload', style: { width: '100%' } }
      break
    case 'table':
      item = { ...base, label: 'Table', props: { columnSchema: [], showActions: true }, style: { width: '100%' } }
      break
    case 'pagination':
      item = { type: 'pagination', props: { currentPage: 1, pageSize: 10, total: 0 } }
      break
    case 'search-list':
      item = {
        type: 'search-list',
        label: 'Search List',
        props: {
          pageSize: 10,
          rowKey: 'id',
          showSelection: false,
          showIndex: true,
          border: true,
          stripe: true,
        },
        listApi: {
          url: '/api/list',
          method: 'post',
        },
        searchFields: [
          { type: 'input', field: 'keyword', label: 'Keyword', span: 6 },
          { type: 'date-range', field: 'dateRange', label: 'Date', span: 8 },
        ],
        columns: [
          { prop: 'name', label: 'Name', width: 120 },
          {
            prop: 'status',
            label: 'Status',
            width: 100,
            render: 'tag',
            colorMap: { active: 'success', inactive: 'danger' },
          },
        ],
        rowActions: [
          { label: 'Edit', type: 'emit', emitEvent: 'edit-row' },
        ],
        buttons: [
          { text: 'Add', buttonType: 'primary', actions: [{ type: 'emit', eventName: 'add-item' }] },
        ],
      }
      break
    default:
      item = { type, field }
  }

  // Full-width components get span: 24 by default
  if (isFullWidthType(type)) {
    item.span = 24
  }

  return item
}
