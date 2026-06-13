import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'select',
  name: 'FormSelect',
  category: 'base',
  description: '封装 TSelect。通过 options 数组或 api 配置定义选项。',
  author: 'yangdongnan',
  props: [
    { name: 'field', type: 'string', default: '—', description: '表单数据绑定字段' },
    { name: 'modelValue', type: 'any', default: '—', description: '选中值（v-model）' },
    { name: 'placeholder', type: 'string', default: '—', description: '占位提示文字' },
    { name: 'disabled', type: 'boolean', default: 'false', description: '是否禁用' },
    { name: 'options', type: 'Array<{ label: string; value: any }>', default: '—', description: '静态选项列表' },
    { name: 'api', type: 'SchemaApiConfig', default: '—', description: '动态选项配置（dictCode / url）' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '静态选项',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '性别', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'select', field: 'demo_gender', options: [{ label: '男', value: 'male' }, { label: '女', value: 'female' }], props: { placeholder: '请选择性别' } }] },
            { type: 'grid-col', span: 4, label: '学历', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'select', field: 'demo_edu', options: [{ label: '高中', value: 'high' }, { label: '本科', value: 'bachelor' }, { label: '硕士', value: 'master' }, { label: '博士', value: 'phd' }], props: { placeholder: '请选择学历' } }] }
          ]
        }
      ]
    },
    {
      title: '动态选项 (API)',
      description: '通过 api 配置从远程接口加载选项',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '字典选择', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'select', field: 'demo_dict', api: { url: '', dictCode: 'sys_status', labelKey: 'dictLabel', valueKey: 'dictValue' }, props: { placeholder: '从字典加载' } }] },
            { type: 'grid-col', span: 4, label: 'API 选择', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'select', field: 'demo_api', api: { url: '/api/options/departments', method: 'get', labelKey: 'name', valueKey: 'id' }, props: { placeholder: '从 API 加载' } }] }
          ]
        }
      ]
    }
  ]
}

export default doc
