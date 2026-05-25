import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'date-time-slot',
  name: 'FgDateTimeSlot',
  category: 'business',
  description: '日期 + 时段选择组件，如 "上午/下午/晚上"。',
  author: 'yangdongnan',
  props: [
    { name: 'modelValue', type: '{ date: string; slot: string }', default: '—', description: '选中值（v-model）' },
    { name: 'disabled', type: 'boolean', default: 'false', description: '是否禁用' },
    { name: 'placeholder', type: 'string', default: '—', description: '占位提示文字' },
    { name: 'slots', type: 'Array<{ label: string; value: string }>', default: '—', description: '时段选项' }
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
            { type: 'grid-col', span: 4, label: '预约时间', align: 'center' },
            { type: 'grid-col', span: 20, children: [
              { type: 'date-time-slot', props: { placeholder: '请选择日期和时段' } }
            ]}
          ]
        }
      ]
    }
  ]
}

export default doc
