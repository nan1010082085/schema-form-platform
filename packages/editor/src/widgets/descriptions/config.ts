import type { WidgetConfig } from '../base/types'

/** 描述列表单项的值类型 */
export type DescriptionItemType = 'text' | 'tag' | 'link' | 'image' | 'date'

/** 描述列表单项配置 */
export interface DescriptionItemConfig {
  label: string
  field: string
  type: DescriptionItemType
  /** 值前缀（如 ¥） */
  prefix?: string
  /** 值后缀 */
  suffix?: string
  /** tag 类型时的选项映射 */
  options?: { label: string; value: string | number; color?: string }[]
  /** link 类型时的点击行为 */
  href?: string
  /** image 类型时的宽度 */
  imageWidth?: number
  /** image 类型时的高度 */
  imageHeight?: number
  /** date 类型时的格式化 */
  format?: string
  /** 跨列数 */
  span?: number
}

export const descriptionsConfig: WidgetConfig = {
  name: 'FgDescriptions',
  displayName: '描述列表',
  description: '以 key-value 形式展示数据，支持多列布局和多种值类型',
  author: 'yangdongnan',
  defaultStyle: { width: '100%' },
  exposedValues: [
    { key: 'data', type: 'object', description: '描述列表数据对象' },
  ],
  configPanels: ['events', 'api', 'variables'],
  defaultProps: {
    title: '详情',
    column: 2,
    border: true,
    items: [
      { label: '字段1', field: 'field1', type: 'text' },
      { label: '字段2', field: 'field2', type: 'text' },
    ],
  },
  propertyPanel: {
    basic: ['label'],
    style: ['margin', 'padding'],
    props: [
      { key: 'title', label: '标题', type: 'input', default: '详情' },
      { key: 'column', label: '列数', type: 'select', default: 2, options: [
        { label: '1 列', value: 1 },
        { label: '2 列', value: 2 },
        { label: '3 列', value: 3 },
        { label: '4 列', value: 4 },
      ]},
      { key: 'border', label: '显示边框', type: 'switch', default: true },
      { key: 'items', label: '字段列表', type: 'array-editor', itemLabel: 'label', fields: [
        { key: 'label', label: '标签', type: 'text', placeholder: '显示名称' },
        { key: 'field', label: '字段', type: 'text', placeholder: '数据字段名' },
        { key: 'type', label: '类型', type: 'select', default: 'text', options: [
          { label: '文本', value: 'text' },
          { label: '标签', value: 'tag' },
          { label: '链接', value: 'link' },
          { label: '图片', value: 'image' },
          { label: '日期', value: 'date' },
        ]},
        { key: 'prefix', label: '前缀', type: 'text', placeholder: '如 ¥' },
        { key: 'suffix', label: '后缀', type: 'text', placeholder: '如 元' },
        { key: 'span', label: '跨列', type: 'number', default: 1 },
      ]},
    ],
  },
}
