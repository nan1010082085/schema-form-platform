import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'banner',
  name: 'FgBanner',
  category: 'business',
  description: '轮播图组件，基于 ElCarousel 封装。',
  author: 'yangdongnan',
  props: [
    { name: 'images', type: 'Array<{ id; src; description? }>', default: '—', description: '图片列表' },
    { name: 'height', type: 'string', default: '—', description: '轮播高度' },
    { name: 'interval', type: 'number', default: '3000', description: '自动切换间隔（ms）' }
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
              { type: 'banner', props: {
                images: [
                  { id: 1, src: 'https://via.placeholder.com/900x400/1369C1/fff?text=Banner+1', description: 'Banner 1' },
                  { id: 2, src: 'https://via.placeholder.com/900x400/26A036/fff?text=Banner+2', description: 'Banner 2' }
                ],
                height: '300px'
              }}
            ]}
          ]
        }
      ]
    }
  ]
}

export default doc
