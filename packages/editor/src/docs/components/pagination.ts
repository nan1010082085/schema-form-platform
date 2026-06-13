import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'pagination',
  name: 'FgPagination',
  category: 'business',
  description: '封装 TPagination，对齐 UI 规范：字号 16px，上边距 24px。支持双向绑定 currentPage / pageSize。',
  author: 'yangdongnan',
  props: [
    { name: 'currentPage', type: 'number', default: '1', description: '当前页码（v-model）' },
    { name: 'pageSize', type: 'number', default: '10', description: '每页条数（v-model）' },
    { name: 'total', type: 'number', default: '—', description: '总条数' },
    { name: 'pageSizes', type: 'number[]', default: '[10,20,30,40,50]', description: '每页条数选项' }
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
            { type: 'grid-col', span: 24, children: [
              { type: 'pagination', props: { currentPage: 1, pageSize: 10, total: 128 } }
            ]}
          ]
        }
      ]
    }
  ]
}

export default doc
