import type { WidgetConfig } from '../base/types'

export const microAppContainerConfig: WidgetConfig = {
  name: 'FgMicroAppContainer',
  displayName: '微应用容器',
  description: '通过 qiankun 加载子应用（editor/flow/ai），支持变量传参',
  author: 'system',
  defaultStyle: {},
  defaultProps: {
    microappApp: '',
    height: '100%',
    variables: {},
  },
  propertyPanel: {
    basic: [
      {
        key: 'microappApp',
        label: '子应用',
        type: 'select',
        options: [
          { label: '编辑器', value: 'editor' },
          { label: '流程', value: 'flow' },
          { label: 'AI', value: 'ai' },
        ],
        default: '',
        placeholder: '选择子应用',
      },
      {
        key: 'height',
        label: '容器高度',
        type: 'input',
        default: '100%',
        placeholder: '例：400px 或 100%',
      },
    ],
    style: [],
    props: [],
  },
  configPanels: ['variables'],
  exposedValues: [
    { key: 'containerRef', type: 'object', description: '容器引用，可用于 postMessage' },
  ],
  eventTargets: [],
  receivableEvents: [
    { name: 'message', description: '接收微应用消息' },
    { name: 'ready', description: '微应用加载完成' },
  ],
}
