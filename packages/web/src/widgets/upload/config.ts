import type { WidgetConfig } from '../base/types'

export const uploadConfig: WidgetConfig = {
  name: 'FgUpload',
  displayName: '文件上传',
  description: '文件上传组件，支持文件类型和大小限制',
  author: 'yangdongnan',
  defaultStyle: {
    width: '240px',
    height: '44px',
  },
  defaultProps: {
    accept: '',
    multiple: false,
    maxSize: 10,
    limit: 5,
    buttonText: '点击上传',
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '当前字段值', example: '' },
  ],
  configPanels: ['events', 'rules', 'variables'] as const,
  propertyPanel: {
    basic: ['field', 'label'],
    style: [],
    props: [
      { key: 'accept', label: '文件类型', type: 'input', placeholder: '.jpg,.png,.pdf' },
      { key: 'multiple', label: '多选', type: 'switch', default: false },
      { key: 'limit', label: '最大数量', type: 'number', default: 5 },
      { key: 'buttonText', label: '按钮文字', type: 'input', default: '点击上传' },
    ],
  },
}
