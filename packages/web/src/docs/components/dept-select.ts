import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'dept-select',
  name: 'FgDeptSelect',
  category: 'business',
  description: '树形弹窗选择部门。支持单选/多选、搜索过滤、自定义标题。',
  props: [
    { name: 'modelValue', type: 'string | string[]', default: '—', description: '已选部门 ID（v-model）' },
    { name: 'visible', type: 'boolean', default: '—', description: '弹窗可见性（v-model）' },
    { name: 'data', type: 'DeptNode[]', default: '—', description: '部门树数据' },
    { name: 'multiple', type: 'boolean', default: 'false', description: '是否多选' },
    { name: 'title', type: 'string', default: '—', description: '弹窗标题' },
    { name: 'defaultProps', type: '{ label?: string; children?: string }', default: '—', description: '字段映射' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: 'Schema 中使用',
      description: '需要配合 dialog 使用',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '所属部门', align: 'center' },
            { type: 'grid-col', span: 20, children: [
              { type: 'dept-select', props: { data: [], title: '选择部门' } }
            ]}
          ]
        }
      ]
    }
  ]
}

export default doc
