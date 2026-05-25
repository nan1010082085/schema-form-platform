import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'grid-row',
  name: 'grid-row',
  category: 'layout',
  description: '表格行容器，只能包含 grid-col 子节点，对应视觉上的行。使用 flex 布局。',
  author: 'yangdongnan',
  props: [],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      description: '一行两列，各占 12 格',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 12, label: '左半区', align: 'center' },
            { type: 'grid-col', span: 12, label: '右半区', align: 'center' }
          ]
        }
      ]
    },
    {
      title: '多行布局',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 8, label: '列 1', align: 'center' },
            { type: 'grid-col', span: 8, label: '列 2', align: 'center' },
            { type: 'grid-col', span: 8, label: '列 3', align: 'center' }
          ]
        },
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 6, label: 'A', align: 'center' },
            { type: 'grid-col', span: 6, label: 'B', align: 'center' },
            { type: 'grid-col', span: 6, label: 'C', align: 'center' },
            { type: 'grid-col', span: 6, label: 'D', align: 'center' }
          ]
        }
      ]
    }
  ]
}

export default doc
