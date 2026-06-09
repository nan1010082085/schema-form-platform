import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'file-preview',
  name: 'FgFilePreview',
  category: 'business',
  description: '文件选择预览组件（S19 新增）。两列布局：左侧显示已选文件名称列表，右侧选择按钮点击弹出文件选择对话框。支持单选/多选、最大数量限制。',
  author: 'yangdongnan',
  props: [
    { name: 'modelValue', type: 'string | string[]', default: '—', description: '选中的文件ID（v-model），单选为 string，多选为 string[]' },
    { name: 'options', type: '{name:string,url?:string,id?:string|number}[]', default: '—', description: '可选文件列表（静态或 API 加载）' },
    { name: 'multiple', type: 'boolean', default: 'false', description: '是否允许多选' },
    { name: 'maxFiles', type: 'number', default: '—', description: '多选模式下最大选择数量' },
    { name: 'dialogTitle', type: 'string', default: "'选择文件'", description: '文件选择对话框标题' },
  ],
  events: [
    { name: 'update:modelValue', description: '选中文件变化时触发', params: 'value: string | string[]' },
  ],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '多选文件',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '附件', align: 'center' },
            {
              type: 'grid-col', span: 20,
              children: [{
                type: 'file-preview', field: 'doc_files', multiple: true, maxFiles: 5,
                options: [
                  { label: '需求文档_v3.pdf', value: '1' },
                  { label: '技术方案.md', value: '2' },
                  { label: '验收报告.xlsx', value: '3' },
                ],
              }],
            },
          ],
        },
      ],
    },
    {
      title: '单选文件 + API 加载',
      description: 'options 可通过 api 动态加载。Schema 示例展示 API 配置。',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '模板', align: 'center' },
            {
              type: 'grid-col', span: 20,
              children: [{
                type: 'file-preview', field: 'template_file', multiple: false,
                api: { url: '/api/templates', method: 'get', dataPath: 'data', labelKey: 'name', valueKey: 'id' },
              }],
            },
          ],
        },
      ],
    },
  ],
}

export default doc
