import type { WidgetConfig } from '../base/types'
import { microappDefaults, createMicroappPropertyItems } from '../base/microappConfig'

export const microAppContainerConfig: WidgetConfig = {
  name: 'FgMicroAppContainer',
  displayName: '微应用容器',
  description: '通过 qiankun loadMicroApp 动态加载子应用，支持沙箱隔离、参数传递、超时兜底',
  author: 'system',
  defaultStyle: {},
  defaultProps: {
    ...microappDefaults,
    height: '100%',
    variables: {},
  },
  propertyPanel: {
    basic: [
      ...createMicroappPropertyItems('true'),
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
    { name: 'error', description: '微应用加载失败' },
  ],
}
