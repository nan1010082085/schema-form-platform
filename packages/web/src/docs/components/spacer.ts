import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'spacer',
  name: 'FgSpacer',
  category: 'layout',
  description: '垂直间距组件，通过 height 属性控制高度。',
  author: 'yangdongnan',
  props: [
    { name: 'height', type: 'string', default: '"20px"', description: '间距高度' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      schema: [
        { type: 'grid-row', children: [{ type: 'grid-col', span: 24, label: '上方内容', align: 'center' }] },
        { type: 'spacer', props: { height: '40px' } },
        { type: 'grid-row', children: [{ type: 'grid-col', span: 24, label: '下方内容（间距 40px）', align: 'center' }] }
      ]
    }
  ]
}

export default doc
