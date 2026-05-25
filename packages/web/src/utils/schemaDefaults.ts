/**
 * schemaDefaults — Default PartialWidget factory for each component type
 *
 * Extracted from EditorCanvas.vue createDefaultSchema() so it can be shared
 * between the editor store and editor canvas component.
 */
import type { PartialWidget, SchemaType } from '@/widgets/base/types'
import { isFullWidthType } from '@/widgets/base/types'

/**
 * Create a default PartialWidget for a given component type.
 *
 * Used when dragging from the component panel onto the canvas.
 * Returns a fully initialized schema item with sensible defaults.
 */
export function createDefaultSchema(type: SchemaType): PartialWidget {
  // ---- Layout types ----
  if (type === 'grid-row') {
    return { type: 'grid-row', children: [], style: { height: '44px' } }
  }
  if (type === 'grid-col') {
    return { type: 'grid-col', span: 12, children: [], style: { height: '44px' } }
  }
  if (type === 'card') {
    return { type: 'card', label: 'Card', children: [], style: { padding: '16px', borderRadius: '4px', backgroundColor: '#f5f7fa' } }
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
      style: { backgroundColor: '#f5f7fa' },
    }
  }
  if (type === 'dialog') {
    return {
      type: 'dialog',
      label: 'Dialog',
      props: { title: 'Dialog', width: '400px' },
      children: [],
      style: { backgroundColor: '#f5f7fa' },
    }
  }

  // ---- Form components: generate a unique field name ----
  const field = `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const base: PartialWidget = { type, field }

  let item: PartialWidget

  switch (type) {
    case 'input':
    case 'textarea':
      item = { ...base, label: 'Input', props: { placeholder: 'Please enter' }, style: { height: '40px' } }
      break
    case 'number':
      item = { ...base, label: 'Number', props: { placeholder: 'Please enter' }, style: { height: '40px' } }
      break
    case 'select':
      item = {
        ...base,
        label: 'Select',
        options: [
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' },
        ],
        style: { height: '40px' },
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
        style: { height: '40px' },
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
        style: { height: '40px' },
      }
      break
    case 'date':
      item = { ...base, label: 'Date', style: { height: '40px' } }
      break
    case 'date-range':
      item = { ...base, label: 'Date Range', style: { height: '40px' } }
      break
    case 'richtext':
      item = { ...base, label: 'Rich Text', style: { height: '120px' } }
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
      item = { ...base, label: 'Upload' }
      break
    case 'banner':
      item = { type: 'banner', props: { text: '提示信息', type: 'info', closable: true } }
      break
    case 'tree-layout':
      item = { type: 'tree-layout', label: '树形布局', props: { title: '树形布局', showSearch: true }, children: [] }
      break
    case 'date-time-slot':
      item = { ...base, label: '日期时间区间', props: { startPlaceholder: '开始时间', endPlaceholder: '结束时间', format: 'YYYY-MM-DD HH:mm:ss', rangeSeparator: '至' } }
      break
    case 'file-list':
      item = { type: 'file-list', props: { title: '附件', allowDelete: true, allowPreview: true } }
      break
    case 'transfer':
      item = { type: 'transfer', props: { titles: ['待选', '已选'], filterable: true } }
      break
    case 'editable-table':
      item = { ...base, label: '可编辑表格', props: { title: '可编辑表格', addButtonText: '添加行', showAddButton: true, showDeleteButton: true, maxRows: 0 } }
      break
    case 'table':
      item = { ...base, label: 'Table', props: { columnSchema: [], showActions: true } }
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
