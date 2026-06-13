import type { WidgetConfig } from '../base/types'
export const dividerConfig: WidgetConfig = {
  name: 'FgDivider',
  displayName: '分割线',
  description: '分割线组件，用于内容区域分隔',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
  },
  configPanels: ['events'],
  defaultProps: {
    direction: 'horizontal' as 'horizontal' | 'vertical',
    contentPosition: 'center' as 'left' | 'center' | 'right',
    content: '',
  },
  propertyPanel: {
    basic: ['field', 'label'],
    style: ['margin', 'padding'],
    props: [
      {
        key: 'direction',
        label: '方向',
        type: 'select',
        options: [
          { label: '水平', value: 'horizontal' },
          { label: '垂直', value: 'vertical' },
        ],
        default: 'horizontal',
      },
      {
        key: 'contentPosition',
        label: '文字位置',
        type: 'select',
        options: [
          { label: '左对齐', value: 'left' },
          { label: '居中', value: 'center' },
          { label: '右对齐', value: 'right' },
        ],
        default: 'center',
      },
      { key: 'content', label: '文字内容', type: 'input', default: '' },
    ],
  },
}
