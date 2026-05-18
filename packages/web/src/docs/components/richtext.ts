import type { ComponentDoc } from './types'
import { simpleRow } from './helpers'

const doc: ComponentDoc = {
  id: 'richtext',
  name: 'FormRichText',
  category: 'base',
  description: '富文本编辑器组件，基于 textarea 封装，支持 maxLength 限制字数。',
  props: [
    { name: 'field', type: 'string', default: '—', description: '表单数据绑定字段' },
    { name: 'modelValue', type: 'string', default: '—', description: '文本值（v-model）' },
    { name: 'placeholder', type: 'string', default: '—', description: '占位提示文字' },
    { name: 'disabled', type: 'boolean', default: 'false', description: '是否禁用' },
    { name: 'readonly', type: 'boolean', default: 'false', description: '是否只读' },
    { name: 'rows', type: 'number', default: '—', description: '行数' },
    { name: 'maxLength', type: 'number', default: '—', description: '最大字数限制' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      schema: [
        simpleRow('正文', 4, 20, { type: 'richtext', field: 'demo_richtext', props: { placeholder: '请输入正文内容', rows: 6, maxLength: 2000 } })
      ]
    }
  ]
}

export default doc
