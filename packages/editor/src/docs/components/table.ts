import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'table',
  name: 'FgTable',
  category: 'business',
  description: '通用表格组件。对齐 UI 规范：斑马纹、序号列 48px、文字溢出截断。支持 selection、自定义列插槽。',
  author: 'yangdongnan',
  props: [
    { name: 'data', type: 'any[]', default: '—', description: '表格数据' },
    { name: 'columns', type: 'TableColumn[]', default: '—', description: '列配置' },
    { name: 'showIndex', type: 'boolean', default: 'false', description: '是否显示序号列' },
    { name: 'showSelection', type: 'boolean', default: 'false', description: '是否显示选择列' },
    { name: 'maxHeight', type: 'string | number', default: '—', description: '最大高度' },
    { name: 'border', type: 'boolean', default: 'false', description: '是否显示边框' },
    { name: 'stripe', type: 'boolean', default: 'true', description: '是否斑马纹' },
    { name: 'rowKey', type: 'string', default: '—', description: '行数据唯一标识字段' },
    { name: 'loading', type: 'boolean', default: 'false', description: '是否加载中' },
    { name: 'emptyText', type: 'string', default: '—', description: '空数据文案' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: 'Schema 中使用',
      description: '通过 schema props 配置表格',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 24, children: [
              { type: 'table', props: {
                data: [
                  { id: 1, name: '张三', dept: '技术部', role: '前端开发' },
                  { id: 2, name: '李四', dept: '产品部', role: '产品经理' },
                  { id: 3, name: '王五', dept: '设计部', role: 'UI 设计师' }
                ],
                columns: [
                  { prop: 'name', label: '姓名', width: '100' },
                  { prop: 'dept', label: '部门', width: '120' },
                  { prop: 'role', label: '角色' }
                ],
                showIndex: true,
                stripe: true
              }}
            ]}
          ]
        }
      ]
    }
  ]
}

export default doc
