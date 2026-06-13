import type { WidgetConfig } from '../base/types'

export const rateConfig: WidgetConfig = {
  name: 'FgRate',
  displayName: '评分',
  description: '评分控件，用于用户打分评价场景',
  author: 'yangdongnan',
  defaultStyle: {
    width: '240px',
    height: '44px',
  },
  defaultProps: {
    max: 5,
    disabled: false,
    allowHalf: false,
    showText: false,
    showScore: false,
    voidColor: '',
    voidIconClass: '',
    colors: [],
    iconClasses: [],
  },
  exposedValues: [
    { key: 'value', type: 'number', description: '当前评分值', example: 0 },
  ],
  configPanels: ['events', 'rules', 'variables'] as const,
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'max', label: '最大分值', type: 'number', default: 5 },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      { key: 'allowHalf', label: '允许半选', type: 'switch', default: false },
      { key: 'showText', label: '显示文字', type: 'switch', default: false },
      { key: 'showScore', label: '显示分数', type: 'switch', default: false },
    ],
  },
}
