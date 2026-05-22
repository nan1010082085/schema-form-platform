import type { WidgetConfig } from '../base/types'
export const formConfig: WidgetConfig = {
  name: 'FgForm',
  displayName: '表单容器',
  description: '表单容器，包裹 el-form，支持表单提交、校验和数据收集',
  defaultStyle: {
    width: '100%',
    padding: '16px',
  },
  defaultProps: {
    labelWidth: '100px',
    labelPosition: 'right' as const,
  },
  propertyPanel: {
    basic: [
      { key: 'labelWidth', label: '标签宽度', type: 'input', default: '100px', desc: '表单标签的宽度' },
      {
        key: 'labelPosition',
        label: '标签位置',
        type: 'select',
        options: [
          { label: '左对齐', value: 'left' },
          { label: '右对齐', value: 'right' },
          { label: '顶部', value: 'top' },
        ],
        default: 'right',
        desc: '表单标签的对齐位置',
      },
    ],
    style: ['padding', 'backgroundColor'],
    props: [],
  },
  configPanels: ['events', 'api'],
}
