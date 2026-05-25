import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'toolbar',
  name: 'FgToolbar',
  category: 'layout',
  description: '固定顶部工具栏，通常包含 toolbar-buttons 按钮组。',
  author: 'yangdongnan',
  props: [],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      description: '工具栏 + 按钮组',
      schema: [
        {
          type: 'toolbar',
          children: [
            { type: 'toolbar-buttons', buttons: [
              { text: '保存', buttonType: 'primary' },
              { text: '提交', buttonType: 'success' },
              { text: '返回' }
            ]}
          ]
        },
        { type: 'spacer', props: { height: '60px' } },
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 24, label: '工具栏下方内容', align: 'center' }
          ]
        }
      ]
    }
  ]
}

export default doc
