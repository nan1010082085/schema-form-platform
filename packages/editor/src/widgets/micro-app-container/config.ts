import type { WidgetConfig } from '../base/types'

export const microAppContainerConfig: WidgetConfig = {
  name: 'FgMicroAppContainer',
  displayName: '微应用容器',
  description: '通过 qiankun loadMicroApp 动态加载子应用，支持沙箱隔离、参数传递、超时兜底',
  author: 'system',
  defaultStyle: {},
  defaultProps: {
    microappName: '',
    microappEntry: '',
    microappSandbox: true,
    microappStyleIsolation: 'experimental',
    microappTimeout: 10000,
    microappFallback: '子应用加载失败',
    microappRouteBase: '',
    height: '100%',
    variables: {},
  },
  propertyPanel: {
    basic: [
      {
        key: 'microappName',
        label: '子应用名称',
        type: 'input',
        default: '',
        placeholder: '例：approval-flow',
      },
      {
        key: 'microappEntry',
        label: '入口地址',
        type: 'input',
        default: '',
        placeholder: '例：http://localhost:6000',
      },
      {
        key: 'microappSandbox',
        label: '启用沙箱',
        type: 'switch',
        default: true,
      },
      {
        key: 'microappStyleIsolation',
        label: 'CSS 隔离',
        type: 'select',
        options: [
          { label: '实验性隔离', value: 'experimental' },
          { label: '严格隔离', value: 'strict' },
          { label: '关闭', value: 'none' },
        ],
        default: 'experimental',
      },
      {
        key: 'microappTimeout',
        label: '加载超时（ms）',
        type: 'number',
        default: 10000,
      },
      {
        key: 'microappFallback',
        label: '加载失败文案',
        type: 'input',
        default: '子应用加载失败',
        placeholder: '加载失败时显示的文案',
      },
      {
        key: 'microappRouteBase',
        label: '路由前缀',
        type: 'input',
        default: '',
        placeholder: '留空自动匹配',
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
    { name: 'error', description: '微应用加载失败' },
  ],
}
