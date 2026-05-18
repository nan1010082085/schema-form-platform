import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'title',
  name: 'FgTitle',
  category: 'layout',
  description: '标题栏组件，带底部主题色边框。',
  props: [
    { name: 'label', type: 'string', default: '—', description: '标题文字' },
    { name: 'color', type: 'string', default: '主色', description: '自定义标题颜色（CSS 颜色值）' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      schema: [
        { type: 'title', props: { label: '这是一个标题' } },
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 24, label: '标题下方内容', align: 'center' }
          ]
        }
      ]
    }
  ]
}

export default doc
