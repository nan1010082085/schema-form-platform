import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'number',
  name: 'FormNumber',
  category: 'base',
  description: '封装 ElInputNumber。支持 min、max、step 属性。',
  props: [
    { name: 'field', type: 'string', default: '—', description: '表单数据绑定字段' },
    { name: 'modelValue', type: 'number', default: '—', description: '数值（v-model）' },
    { name: 'placeholder', type: 'string', default: '—', description: '占位提示文字' },
    { name: 'disabled', type: 'boolean', default: 'false', description: '是否禁用' },
    { name: 'readonly', type: 'boolean', default: 'false', description: '是否只读' },
    { name: 'min', type: 'number', default: '—', description: '最小值' },
    { name: 'max', type: 'number', default: '—', description: '最大值' }
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
            { type: 'grid-col', span: 4, label: '年龄', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'number', field: 'demo_age', props: { placeholder: '请输入年龄', min: 0, max: 150 } }] },
            { type: 'grid-col', span: 4, label: '工龄', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'number', field: 'demo_work_years', props: { placeholder: '请输入工龄', min: 0, step: 0.5 } }] }
          ]
        }
      ]
    }
  ]
}

export default doc
