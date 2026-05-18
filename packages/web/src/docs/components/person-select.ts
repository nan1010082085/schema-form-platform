import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'person-select',
  name: 'FgPersonSelect',
  category: 'business',
  description: '左侧部门树 + 右侧待选/已选面板。支持单选/多选模式，已选人员标签展示。',
  props: [
    { name: 'modelValue', type: 'PersonItem[]', default: '[]', description: '已选人员（v-model）' },
    { name: 'treeData', type: 'TreeNode[]', default: '—', description: '部门树数据' },
    { name: 'personList', type: 'PersonItem[]', default: '—', description: '人员列表数据' },
    { name: 'multiple', type: 'boolean', default: 'false', description: '是否多选' },
    { name: 'title', type: 'string', default: '—', description: '标题' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: 'Schema 中使用',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '选择人员', align: 'center' },
            { type: 'grid-col', span: 20, children: [
              { type: 'person-select', props: { modelValue: [], multiple: true } }
            ]}
          ]
        }
      ]
    }
  ]
}

export default doc
