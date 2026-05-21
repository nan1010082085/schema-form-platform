import type { WidgetConfig } from '../base/types'

export const editableTableConfig: WidgetConfig = {
  name: 'FgEditableTable',
  displayName: '可编辑表格',
  description: '可编辑表格，支持动态增删行、列配置',
  defaultStyle: { width: '100%', height: '300px' },
  defaultProps: {
    title: '可编辑表格',
    addButtonText: '添加行',
    showAddButton: true,
    showDeleteButton: true,
    maxRows: 0,
  },
  configPanels: ['events', 'rules'] as const,
  propertyPanel: {
    basic: ['field', 'label'],
    style: ['width', 'height'],
    props: [
      { key: 'title', label: '标题', type: 'input', default: '可编辑表格' },
      { key: 'addButtonText', label: '添加按钮文字', type: 'input', default: '添加行' },
      { key: 'showAddButton', label: '显示添加按钮', type: 'switch', default: true },
      { key: 'showDeleteButton', label: '显示删除按钮', type: 'switch', default: true },
      { key: 'maxRows', label: '最大行数(0不限)', type: 'number', default: 0 },
      { key: 'columns', label: '列配置', type: 'columns' },
    ],
  },
}
