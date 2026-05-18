import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'tabs',
  name: 'FgTabs',
  category: 'layout',
  description: '标签页容器。children 中每一项为一个 tab 面板，切换 tab 时保留各 tab 内的 formData。支持 controlled mode。',
  props: [
    { name: 'modelValue', type: 'string | number', default: '—', description: '当前激活 tab（支持 v-model）' },
    { name: 'tabPosition', type: "'top' | 'left' | 'right' | 'bottom'", default: "'top'", description: '标签位置' },
    { name: 'type', type: "'card' | 'border-card' | ''", default: "''", description: '标签风格' },
  ],
  events: [
    { name: 'tab-change', description: '标签切换时触发', params: 'tabName: string | number' },
  ],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础标签页',
      schema: [
        {
          type: 'tabs',
          props: { modelValue: 'tab1' },
          children: [
            {
              type: 'card',
              props: { tabLabel: '基本信息', tabName: 'tab1' },
              children: [
                { type: 'grid-row', children: [{ type: 'grid-col', span: 12, children: [{ type: 'input', field: 'tab1_name', label: '姓名' }] }] },
              ],
            },
            {
              type: 'card',
              props: { tabLabel: '高级设置', tabName: 'tab2' },
              children: [
                { type: 'grid-row', children: [{ type: 'grid-col', span: 12, children: [{ type: 'select', field: 'tab2_level', label: '级别', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] }] }] },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export default doc
