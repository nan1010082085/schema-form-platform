import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'detail-form',
  name: 'FgDetailForm',
  category: 'business',
  description: '详情表单组件，用于展示只读数据。',
  props: [
    { name: 'fields', type: 'FieldConfig[]', default: '—', description: '字段配置（name/text/required/hide/class）' },
    { name: 'title', type: 'string', default: '—', description: '表单标题' }
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
              { type: 'detail-form', props: {
                title: '会议详情',
                fields: [
                  { name: 'title', text: '会议名称', required: true, class: 'full-row' },
                  { name: 'startTime', text: '开始时间', class: 'third-row' },
                  { name: 'endTime', text: '结束时间', class: 'third-row' },
                  { name: 'room', text: '会议室', class: 'third-row' }
                ]
              }}
            ]}
          ]
        }
      ]
    }
  ]
}

export default doc
