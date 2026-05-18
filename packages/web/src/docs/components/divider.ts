import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'divider',
  name: 'FgDivider',
  category: 'layout',
  description: '水平分割线，用于分隔内容区域。',
  props: [],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      schema: [
        { type: 'grid-row', children: [{ type: 'grid-col', span: 24, label: '上方内容', align: 'center' }] },
        { type: 'divider' },
        { type: 'grid-row', children: [{ type: 'grid-col', span: 24, label: '下方内容', align: 'center' }] }
      ]
    }
  ]
}

export default doc
