import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'file-list',
  name: 'FgFileList',
  category: 'business',
  description: '文件上传/下载/预览/删除组件。支持文件大小格式化、上传校验、禁用态。',
  author: 'yangdongnan',
  props: [
    { name: 'fileList', type: 'FileItem[]', default: '[]', description: '文件列表' },
    { name: 'config', type: 'FileConfig', default: '—', description: '配置（accept/maxSize/maxCount/multiple）' },
    { name: 'showUpload', type: 'boolean', default: 'true', description: '是否显示上传按钮' },
    { name: 'showDelete', type: 'boolean', default: 'true', description: '是否显示删除按钮' },
    { name: 'showDownload', type: 'boolean', default: 'true', description: '是否显示下载按钮' },
    { name: 'disabled', type: 'boolean', default: 'false', description: '是否禁用' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: 'Schema 中使用',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '附件', align: 'center' },
            { type: 'grid-col', span: 20, children: [
              { type: 'file-list', props: { fileList: [], showUpload: true, showDownload: true, showDelete: true } }
            ]}
          ]
        }
      ]
    }
  ]
}

export default doc
