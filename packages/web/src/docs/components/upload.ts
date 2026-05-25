import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'upload',
  name: 'FgUpload',
  category: 'business',
  description: '支持单文件/多文件/图片模式，拖拽上传，文件大小限制，类型过滤。',
  author: 'yangdongnan',
  props: [
    { name: 'modelValue', type: 'FileItem[]', default: '[]', description: '文件列表（v-model）' },
    { name: 'action', type: 'string', default: '—', description: '上传接口地址' },
    { name: 'headers', type: 'Record<string, string>', default: '—', description: '上传请求头' },
    { name: 'multiple', type: 'boolean', default: 'false', description: '是否支持多选' },
    { name: 'accept', type: 'string', default: '—', description: '接受的文件类型' },
    { name: 'limit', type: 'number', default: '—', description: '最大上传数量' },
    { name: 'maxSize', type: 'number', default: '—', description: '单文件最大体积（MB）' },
    { name: 'listType', type: '"text" | "picture" | "picture-card"', default: '"text"', description: '列表展示模式' },
    { name: 'disabled', type: 'boolean', default: 'false', description: '是否禁用' },
    { name: 'drag', type: 'boolean', default: 'false', description: '是否支持拖拽上传' },
    { name: 'tip', type: 'string', default: '—', description: '提示文字' },
    { name: 'buttonText', type: 'string', default: '—', description: '按钮文字' }
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
            { type: 'grid-col', span: 4, label: '上传文件', align: 'center' },
            { type: 'grid-col', span: 20, children: [{ type: 'upload', props: { limit: 3, maxSize: 10, tip: '支持 .doc/.pdf/.png，单文件最大 10MB' } }] }
          ]
        }
      ]
    }
  ]
}

export default doc
