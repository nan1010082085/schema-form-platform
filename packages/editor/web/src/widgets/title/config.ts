import type { WidgetConfig } from '../base/types'
export const titleConfig: WidgetConfig = {
  name: 'FgTitle',
  displayName: '标题',
  description: '标题组件，用于页面或区块标题展示',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    fontSize: '20px',
    color: 'var(--text-color-title)',
  },
  configPanels: ['events'],
  defaultProps: {
    content: '标题文字',
    level: 3 as 1 | 2 | 3 | 4,
    align: 'left' as 'left' | 'center' | 'right',
  },
  propertyPanel: {
    basic: ['field', 'label'],
    style: ['fontSize', 'fontWeight', 'color', 'backgroundColor'],
    props: [
      { key: 'content', label: '标题内容', type: 'input', default: '标题文字' },
      {
        key: 'level',
        label: '级别',
        type: 'select',
        options: [
          { label: 'H1', value: 1 },
          { label: 'H2', value: 2 },
          { label: 'H3', value: 3 },
          { label: 'H4', value: 4 },
        ],
        default: 3,
      },
      {
        key: 'align',
        label: '对齐',
        type: 'select',
        options: [
          { label: '左对齐', value: 'left' },
          { label: '居中', value: 'center' },
          { label: '右对齐', value: 'right' },
        ],
        default: 'left',
      },
    ],
  },
}
