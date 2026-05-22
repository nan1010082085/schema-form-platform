import type { WidgetConfig } from '../base/types'

export const detailFormConfig: WidgetConfig = {
  name: 'FgDetailForm',
  displayName: '详情表单',
  description: '详情表单组件，用于只读数据展示',
  defaultStyle: { width: '100%' },
  configPanels: ['events'],
  defaultProps: {
    title: '详情',
    columns: 2,
    bordered: true,
  },
  propertyPanel: {
    basic: ['label'],
    style: ['width'],
    props: [
      { key: 'title', label: '标题', type: 'input', default: '详情' },
      { key: 'columns', label: '列数', type: 'number', default: 2 },
      { key: 'bordered', label: '边框', type: 'switch', default: true },
    ],
  },
}
