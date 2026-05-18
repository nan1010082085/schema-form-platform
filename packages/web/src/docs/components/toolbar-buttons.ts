import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'toolbar-buttons',
  name: 'toolbar-buttons',
  category: 'business',
  description: '居中对齐的工具栏按钮组，支持动态背景色，用于页面顶部操作区。Schema 驱动，支持 action 联动。',
  props: [
    { name: 'buttons', type: 'SchemaButtonConfig[]', default: '[]', description: '按钮配置数组' },
    { name: 'background', type: 'string', default: '#EEF5FF', description: '动态背景色' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      description: '居中对齐的按钮组',
      schema: [
        {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col', span: 24, align: 'center', children: [
                {
                  type: 'toolbar-buttons',
                  buttons: [
                    { text: '提交', buttonType: 'primary' },
                    { text: '保存草稿' },
                    { text: '返回' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      title: '自定义背景色',
      description: '通过 background prop 设置不同背景色',
      schema: [
        {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col', span: 24, align: 'center', children: [
                {
                  type: 'toolbar-buttons',
                  props: { background: '#FFF7E6' },
                  buttons: [
                    { text: '审批通过', buttonType: 'primary' },
                    { text: '驳回', buttonType: 'danger' }
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
