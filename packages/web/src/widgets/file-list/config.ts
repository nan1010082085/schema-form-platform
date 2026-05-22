import type { WidgetConfig } from '../base/types'

export const fileListConfig: WidgetConfig = {
  name: 'FgFileList',
  displayName: '文件列表',
  description: '文件列表组件，支持文件预览和删除',
  defaultStyle: { width: '100%' },
  configPanels: ['events', 'api'],
  defaultProps: {
    title: '附件',
    allowDelete: true,
    allowPreview: true,
  },
  propertyPanel: {
    basic: ['label'],
    style: ['width'],
    props: [
      { key: 'title', label: '标题', type: 'input', default: '附件' },
      { key: 'allowDelete', label: '允许删除', type: 'switch', default: true },
      { key: 'allowPreview', label: '允许预览', type: 'switch', default: true },
    ],
  },
}
