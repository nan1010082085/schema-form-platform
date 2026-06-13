import type { ComponentDoc } from './types'
import { simpleRow } from './helpers'

const doc: ComponentDoc = {
  id: 'textarea',
  name: 'FormTextarea',
  category: 'base',
  description: '封装 TTextarea。支持 rows、autosize 属性。',
  author: 'yangdongnan',
  props: [
    { name: 'field', type: 'string', default: '—', description: '表单数据绑定字段' },
    { name: 'modelValue', type: 'string', default: '—', description: '文本值（v-model）' },
    { name: 'placeholder', type: 'string', default: '—', description: '占位提示文字' },
    { name: 'disabled', type: 'boolean', default: 'false', description: '是否禁用' },
    { name: 'readonly', type: 'boolean', default: 'false', description: '是否只读' },
    { name: 'rows', type: 'number', default: '—', description: '行数' },
    { name: 'autosize', type: 'boolean | { minRows?: number; maxRows?: number }', default: '—', description: '自适应高度' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      schema: [
        simpleRow('备注', 4, 20, { type: 'textarea', field: 'demo_textarea', props: { placeholder: '请输入备注信息', rows: 3 } })
      ]
    }
  ]
}

export default doc
