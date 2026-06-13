import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'date',
  name: 'FormDate',
  category: 'base',
  description: '封装 TDatePicker，单日期选择器。',
  author: 'yangdongnan',
  props: [
    { name: 'field', type: 'string', default: '—', description: '表单数据绑定字段' },
    { name: 'modelValue', type: 'string | Date', default: '—', description: '日期值（v-model）' },
    { name: 'placeholder', type: 'string', default: '—', description: '占位提示文字' },
    { name: 'disabled', type: 'boolean', default: 'false', description: '是否禁用' },
    { name: 'readonly', type: 'boolean', default: 'false', description: '是否只读' },
    { name: 'format', type: 'string', default: '—', description: '日期格式' }
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
            { type: 'grid-col', span: 4, label: '出生日期', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'date', field: 'demo_date', props: { placeholder: '请选择日期' } }] },
            { type: 'grid-col', span: 4, label: '入职日期', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'date', field: 'demo_date2', props: { placeholder: '请选择日期' } }] }
          ]
        }
      ]
    }
  ]
}

export default doc
