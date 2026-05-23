import type { WidgetConfig } from '../base/types'
export const tabsConfig: WidgetConfig = {
  name: 'FgTabs',
  displayName: '页签容器',
  description: '页签容器，支持动态增删标签页，组件绑定到指定标签',
  defaultStyle: {
    width: '100%',
  },
  configPanels: ['events', 'variables'],
  defaultProps: {
    tabs: [
      { key: 'tab1', label: '标签一' },
      { key: 'tab2', label: '标签二' },
    ],
    activeKey: 'tab1',
    type: 'border-card' as const,
    tabPosition: 'top' as const,
  },
  propertyPanel: {
    basic: [
      {
        key: 'type',
        label: '风格类型',
        type: 'select',
        options: [
          { label: '默认', value: '' },
          { label: '卡片', value: 'card' },
          { label: '边框卡片', value: 'border-card' },
        ],
        default: 'border-card',
      },
      {
        key: 'tabPosition',
        label: '标签位置',
        type: 'select',
        options: [
          { label: '顶部', value: 'top' },
          { label: '右侧', value: 'right' },
          { label: '底部', value: 'bottom' },
          { label: '左侧', value: 'left' },
        ],
        default: 'top',
      },
    ],
    style: ['margin', 'padding'],
    props: [
      {
        key: 'tabs',
        label: '页签',
        type: 'array-editor',
        fields: [
          { key: 'key', label: '标识', type: 'text', placeholder: 'tab1' },
          { key: 'label', label: '标签', type: 'text', placeholder: '标签名' },
        ],
      },
    ],
  },
}
