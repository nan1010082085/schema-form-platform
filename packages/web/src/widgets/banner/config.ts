import type { WidgetConfig } from '../base/types'

export const bannerConfig: WidgetConfig = {
  name: 'FgBanner',
  displayName: '横幅',
  description: '横幅提示组件，支持 info/success/warning/error 类型',
  defaultStyle: { width: '100%' },
  defaultProps: {
    text: '提示信息',
    type: 'info' as const,
    closable: true,
  },
  propertyPanel: {
    basic: ['label'],
    style: ['margin', 'padding'],
    props: [
      { key: 'text', label: '提示文字', type: 'input', default: '提示信息' },
      { key: 'type', label: '类型', type: 'select', options: [
        { label: '信息', value: 'info' },
        { label: '成功', value: 'success' },
        { label: '警告', value: 'warning' },
        { label: '错误', value: 'error' },
      ], default: 'info' },
      { key: 'closable', label: '可关闭', type: 'switch', default: true },
    ],
  },
}
