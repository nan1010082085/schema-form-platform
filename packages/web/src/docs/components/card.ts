import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'card',
  name: 'FgCard',
  category: 'layout',
  description: '白色卡片容器，带圆角和阴影。',
  props: [],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      schema: [
        {
          type: 'card',
          children: [
            { type: 'title', props: { label: '卡片标题' } },
            {
              type: 'grid-row',
              children: [
                { type: 'grid-col', span: 12, label: '字段 A', align: 'center',
                  children: [{ type: 'input', field: 'card_demo1', props: { placeholder: '输入' } }] },
                { type: 'grid-col', span: 12, label: '字段 B', align: 'center',
                  children: [{ type: 'input', field: 'card_demo2', props: { placeholder: '输入' } }] }
              ]
            }
          ]
        }
      ]
    }
  ]
}

export default doc
