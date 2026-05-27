import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'transfer',
  name: 'FgTransfer',
  category: 'business',
  description: '封装 ElTransfer，支持搜索过滤、双向绑定、自定义标题。',
  author: 'yangdongnan',
  props: [
    { name: 'modelValue', type: 'Array<string | number>', default: '—', description: '已选 key 数组（v-model）' },
    { name: 'data', type: 'TransferItem[]', default: '—', description: '数据源（{ key, label, disabled? }）' },
    { name: 'titles', type: '[string, string]', default: '—', description: '左右面板标题' },
    { name: 'filterable', type: 'boolean', default: 'false', description: '是否可搜索' },
    { name: 'filterPlaceholder', type: 'string', default: '—', description: '搜索框占位文字' }
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
              { type: 'transfer', props: {
                modelValue: [1, 3, 5],
                data: Array.from({ length: 10 }, (_, i) => ({ key: i + 1, label: `选项 ${i + 1}` })),
                titles: ['待选数据', '已选数据'],
                filterable: true
              }}
            ]}
          ]
        }
      ]
    }
  ]
}

export default doc
