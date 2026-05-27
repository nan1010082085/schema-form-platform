import type { WidgetConfig } from '../base/types'

export const fileListConfig: WidgetConfig = {
  name: 'FgFileList',
  displayName: '文件列表',
  description: '文件列表组件，支持文件预览和删除',
  author: 'yangdongnan',
  defaultStyle: { width: '100%' },
  exposedValues: [
    { key: 'value', type: 'array', description: '文件列表数据' },
  ],
  configPanels: ['events', 'api', 'variables'],
  defaultProps: {
    title: '附件',
    allowDelete: true,
    allowPreview: true,
  },
  propertyPanel: {
    basic: ['label'],
    style: [],
    props: [
      { key: 'title', label: '标题', type: 'input', default: '附件' },
    ],
  },
}
