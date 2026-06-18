import type { WidgetConfig } from '../base/types'

export const microAppContainerConfig: WidgetConfig = {
  name: 'FgMicroAppContainer',
  displayName: '微应用容器',
  description: '嵌入微应用（iframe 或 qiankun 模式），支持 URL 模板变量',
  author: 'system',
  defaultStyle: {},
  defaultProps: {
    microappMode: 'iframe',
    microappUrl: '',
    microappBaseUrl: '',
    microappApp: '',
    height: '100%',
    variables: {},
  },
  propertyPanel: {
    basic: [
      {
        key: 'microappMode',
        label: '嵌入模式',
        type: 'select',
        options: [
          { label: 'iframe（轻量）', value: 'iframe' },
          { label: 'qiankun（完整）', value: 'qiankun' },
        ],
        default: 'iframe',
      },
      {
        key: 'microappUrl',
        label: '微应用 URL',
        type: 'input',
        default: '',
        placeholder: '例：/flow/embed/preview?instanceId=${instanceId}',
        visibleOn: "props.microappMode === 'iframe'",
      },
      {
        key: 'microappBaseUrl',
        label: '基础 URL',
        type: 'input',
        default: '',
        placeholder: '留空使用当前域名',
        visibleOn: "props.microappMode === 'iframe'",
      },
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
        visibleOn: "props.microappMode === 'qiankun'",
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
