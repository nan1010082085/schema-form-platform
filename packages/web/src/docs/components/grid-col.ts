import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'grid-col',
  name: 'grid-col',
  category: 'layout',
  description: '表格单元格，基于 24 栅格。通过 span 控制宽度，label 显示标签文字。',
  props: [
    { name: 'type', type: '"grid-col"', default: '—', description: '节点类型，必须为 grid-col' },
    { name: 'span', type: 'number', default: '24', description: '栅格占位列数（1-24）' },
    { name: 'label', type: 'string', default: '—', description: '标签文字' },
    { name: 'align', type: '"left" | "center" | "right"', default: '"left"', description: '单元格内容对齐方式' },
    { name: 'colspan', type: 'number', default: '—', description: '跨列合并，直接修改栅格权重' },
    { name: 'width', type: 'string', default: '—', description: '自定义宽度（覆盖 span 计算）' },
    { name: 'height', type: 'string', default: '—', description: '自定义高度' },
    { name: 'border', type: 'boolean', default: 'true', description: '是否显示边框' },
    { name: 'hideBorder', type: 'string[]', default: '—', description: '隐藏指定方向边框（top/left/right/bottom）' },
    { name: 'children', type: 'FormSchemaItem[]', default: '—', description: '子节点（表单组件）' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '不同 span',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 6, label: 'span: 6', align: 'center' },
            { type: 'grid-col', span: 6, label: 'span: 6', align: 'center' },
            { type: 'grid-col', span: 12, label: 'span: 12', align: 'center' }
          ]
        }
      ]
    },
    {
      title: '对齐方式',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 8, label: '左对齐', align: 'left' },
            { type: 'grid-col', span: 8, label: '居中', align: 'center' },
            { type: 'grid-col', span: 8, label: '右对齐', align: 'right' }
          ]
        }
      ]
    },
    {
      title: 'colspan 跨列',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '姓名', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'input', field: 'demo_name', props: { placeholder: '请输入' } }] },
            { type: 'grid-col', span: 4, label: '部门', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'input', field: 'demo_dept', props: { placeholder: '请输入' } }] }
          ]
        },
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '备注', align: 'center' },
            { type: 'grid-col', colspan: 20, children: [{ type: 'input', field: 'demo_remark', props: { placeholder: 'colspan: 20' } }] }
          ]
        }
      ]
    },
    {
      title: '隐藏边框',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 8, label: '正常', align: 'center' },
            { type: 'grid-col', span: 8, label: '隐藏上边框', align: 'center', hideBorder: ['top'] },
            { type: 'grid-col', span: 8, label: '隐藏右边框', align: 'center', hideBorder: ['right'] }
          ]
        }
      ]
    }
  ]
}

export default doc
