import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'page',
  name: 'FgPage',
  category: 'layout',
  description: '页面根容器，提供背景色和最小高度。通常作为 schema 树的顶层节点。',
  props: [],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      description: '作为顶层容器，包裹 card',
      schema: [
        {
          type: 'page',
          children: [
            {
              type: 'card',
              children: [
                { type: 'title', props: { label: '页面布局演示' } },
                {
                  type: 'grid-row',
                  children: [
                    { type: 'grid-col', span: 12, label: '字段一', align: 'center',
                      children: [{ type: 'input', field: 'page_demo1', props: { placeholder: '输入内容' } }] },
                    { type: 'grid-col', span: 12, label: '字段二', align: 'center',
                      children: [{ type: 'input', field: 'page_demo2', props: { placeholder: '输入内容' } }] }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

export default doc
