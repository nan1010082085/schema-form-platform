import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'date-range',
  name: 'FormDateRange',
  category: 'base',
  description: '双日期选择器 + 中间文字连接符。通过 props.fieldStart / fieldEnd 指定两个字段，直接读写 formData。',
  props: [
    { name: 'fieldStart', type: 'string', default: '—', description: '开始日期字段名' },
    { name: 'fieldEnd', type: 'string', default: '—', description: '结束日期字段名' },
    { name: 'connector', type: 'string', default: '"至"', description: '中间连接符文字' },
    { name: 'startPlaceholder', type: 'string', default: '—', description: '开始日期占位文字' },
    { name: 'endPlaceholder', type: 'string', default: '—', description: '结束日期占位文字' },
    { name: 'disabled', type: 'boolean', default: 'false', description: '是否禁用' },
    { name: 'readonly', type: 'boolean', default: 'false', description: '是否只读' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '起止日期', align: 'center' },
            { type: 'grid-col', span: 20, children: [{ type: 'date-range', props: { fieldStart: 'demo_dr_start', fieldEnd: 'demo_dr_end', connector: '至', startPlaceholder: '开始日期', endPlaceholder: '结束日期' } }] }
          ]
        }
      ]
    }
  ]
}

export default doc
