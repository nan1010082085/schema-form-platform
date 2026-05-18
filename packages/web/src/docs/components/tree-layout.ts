import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'tree-layout',
  name: 'FgTreeLayout',
  category: 'business',
  description: '左侧树 + 右侧内容的布局组件。',
  props: [
    { name: 'data', type: 'TreeNode[]', default: '—', description: '树数据' },
    { name: 'title', type: 'string', default: '—', description: '标题' },
    { name: 'width', type: 'string', default: '—', description: '树面板宽度' },
    { name: 'showSearch', type: 'boolean', default: 'false', description: '是否显示搜索框' },
    { name: 'defaultExpandAll', type: 'boolean', default: 'false', description: '是否默认展开所有节点' },
    { name: 'defaultProps', type: '{ label?: string; children?: string }', default: '—', description: '字段映射' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      schema: [
        {
          type: 'tree-layout',
          props: {
            data: [
              { id: 'root', name: '组织架构', children: [
                { id: 'tech', name: '技术部', children: [
                  { id: 'fe', name: '前端组' },
                  { id: 'be', name: '后端组' }
                ]},
                { id: 'product', name: '产品部' }
              ]}
            ],
            title: '部门管理',
            showSearch: true
          }
        }
      ]
    }
  ]
}

export default doc
