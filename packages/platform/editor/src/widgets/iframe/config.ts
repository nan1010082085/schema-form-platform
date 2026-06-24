import type { WidgetConfig } from '../base/types'

export const iframeConfig: WidgetConfig = {
  name: 'FgIframe',
  displayName: 'iframe',
  description: '嵌入外部网页',
  author: 'system',
  defaultStyle: {},
  defaultProps: {
    src: '',
    width: '100%',
    height: '400px',
    border: false,
    fullscreen: false,
    dialogMode: false,
  },
  propertyPanel: {
    basic: [
      {
        key: 'src',
        label: 'URL',
        type: 'input',
        default: '',
        placeholder: '请输入 iframe 地址',
        desc: 'iframe 嵌入的外部网页地址',
      },
      {
        key: 'width',
        label: '宽度',
        type: 'input',
        default: '100%',
        placeholder: '例：100% 或 800px',
      },
      {
        key: 'height',
        label: '高度',
        type: 'input',
        default: '400px',
        placeholder: '例：400px 或 100%',
      },
      {
        key: 'border',
        label: '显示边框',
        type: 'switch',
        default: false,
      },
      {
        key: 'fullscreen',
        label: '全屏模式',
        type: 'switch',
        default: false,
        desc: 'iframe 固定铺满整个视口',
      },
      {
        key: 'dialogMode',
        label: '弹框模式',
        type: 'switch',
        default: false,
        desc: '使用遮罩弹框包裹 iframe',
      },
    ],
    style: [],
    props: [],
  },
  configPanels: ['events'],
  exposedValues: [
    { key: 'src', type: 'string', description: '当前 iframe 地址', example: 'https://example.com' },
  ],
  eventTargets: [],
  receivableEvents: [],
}
