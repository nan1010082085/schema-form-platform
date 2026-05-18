import type { ComponentDoc } from './types'
import { simpleRow } from './helpers'

const doc: ComponentDoc = {
  id: 'checkbox',
  name: 'FormCheckbox',
  category: 'base',
  description: '封装 ElCheckboxGroup。通过 options 数组定义选项。',
  props: [
    { name: 'field', type: 'string', default: '—', description: '表单数据绑定字段' },
    { name: 'modelValue', type: 'any[]', default: '—', description: '选中值数组（v-model）' },
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
        simpleRow('技能栈', 4, 20, { type: 'checkbox', field: 'demo_checkbox', options: [{ label: 'Vue', value: 'vue' }, { label: 'React', value: 'react' }, { label: 'TypeScript', value: 'ts' }, { label: 'Node.js', value: 'node' }] })
      ]
    }
  ]
}

export default doc
