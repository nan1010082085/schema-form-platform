import type { ComponentDoc } from './types'
import { simpleRow } from './helpers'

const doc: ComponentDoc = {
  id: 'radio',
  name: 'FormRadio',
  category: 'base',
  description: '封装 TRadioGroup。通过 options 数组定义选项。',
  author: 'yangdongnan',
  props: [
    { name: 'field', type: 'string', default: '—', description: '表单数据绑定字段' },
    { name: 'modelValue', type: 'any', default: '—', description: '选中值（v-model）' },
    { name: 'disabled', type: 'boolean', default: 'false', description: '是否禁用' },
    { name: 'options', type: 'Array<{ label: string; value: any }>', default: '—', description: '选项列表' },
    { name: 'api', type: 'SchemaApiConfig', default: '—', description: '动态选项配置' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      schema: [
        simpleRow('紧急程度', 4, 20, { type: 'radio', field: 'demo_radio', options: [{ label: '普通', value: 'normal' }, { label: '紧急', value: 'urgent' }, { label: '特急', value: 'very_urgent' }] })
      ]
    }
  ]
}

export default doc
