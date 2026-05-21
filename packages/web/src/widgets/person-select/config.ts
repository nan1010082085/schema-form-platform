import type { WidgetConfig } from '../base/types'

export const personSelectConfig: WidgetConfig = {
  name: 'FgPersonSelect',
  displayName: '人员选择',
  description: '人员选择器，支持单选/多选模式',
  defaultStyle: { width: '240px', height: '32px' },
  defaultProps: {
    placeholder: '请选择人员',
    clearable: true,
    multiple: false,
  },
  configPanels: ['events', 'rules'] as const,
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['width'],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请选择人员' },
      { key: 'clearable', label: '可清空', type: 'switch', default: true },
      { key: 'multiple', label: '多选', type: 'switch', default: false },
    ],
  },
}
