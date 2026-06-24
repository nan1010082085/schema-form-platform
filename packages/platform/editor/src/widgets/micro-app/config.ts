import type { WidgetConfig } from '../base/types'

export const microAppConfig: WidgetConfig = {
  name: 'FgMicroApp',
  displayName: '微应用',
  description: '嵌入微前端应用（京东 micro-app 方案）',
  author: 'system',
  defaultStyle: {},
  defaultProps: {
    name: '',
    url: '',
    width: '100%',
    height: '400px',
    iframe: false,
  },
  propertyPanel: {
    basic: [
      {
        key: 'name',
        label: '微应用名称',
        type: 'input',
        default: '',
        placeholder: '例：my-sub-app',
        desc: '微应用唯一标识，对应 <micro-app> 的 name 属性',
      },
      {
        key: 'url',
        label: '微应用 URL',
        type: 'input',
        default: '',
        placeholder: '例：http://localhost:8080',
        desc: '微应用入口地址或文件资源地址',
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
        key: 'iframe',
        label: 'iframe 模式',
        type: 'switch',
        default: false,
        desc: '是否使用 iframe 模式加载微应用',
      },
    ],
    style: [],
    props: [],
  },
  configPanels: ['events'],
  exposedValues: [
    { key: 'name', type: 'string', description: '微应用名称', example: 'my-sub-app' },
    { key: 'url', type: 'string', description: '微应用 URL', example: 'http://localhost:8080' },
  ],
  eventTargets: [],
  receivableEvents: [],
}
