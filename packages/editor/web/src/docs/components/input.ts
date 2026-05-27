import type { ComponentDoc } from './types'
import { simpleRow } from './helpers'

const doc: ComponentDoc = {
  id: 'input',
  name: 'FormInput',
  category: 'base',
  description: '基础文本输入框，封装 ElInput。支持 placeholder、disabled、readonly。',
  author: 'yangdongnan',
  props: [
    { name: 'field', type: 'string', default: '—', description: '表单数据绑定字段' },
    { name: 'modelValue', type: 'string', default: '—', description: '输入值（v-model）' },
    { name: 'placeholder', type: 'string', default: '—', description: '占位提示文字' },
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
        simpleRow('用户名', 4, 20, { type: 'input', field: 'demo_input', props: { placeholder: '请输入用户名' } })
      ]
    },
    {
      title: '禁用 / 只读',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '禁用', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'input', field: 'demo_disabled', defaultValue: 'AUTO-001', props: { disabled: true } }] },
            { type: 'grid-col', span: 4, label: '只读', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'input', field: 'demo_readonly', defaultValue: '只读内容', props: { readonly: true } }] }
          ]
        }
      ]
    }
  ]
}

export default doc
