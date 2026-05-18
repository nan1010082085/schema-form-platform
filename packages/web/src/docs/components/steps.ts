import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'steps',
  name: 'FgSteps',
  category: 'layout',
  description: '步骤条布局容器。children 中的每一项为一个步骤面板，支持上一步/下一步导航，支持步骤切换前的表单校验。',
  props: [
    { name: 'active', type: 'number', default: '0', description: '当前激活步骤索引（支持 v-model）' },
    { name: 'finishStatus', type: "'success' | 'error' | 'process'", default: "'success'", description: '已完成步骤的状态' },
    { name: 'alignCenter', type: 'boolean', default: 'false', description: '标题是否居中' },
    { name: 'simple', type: 'boolean', default: 'false', description: '简洁模式' },
  ],
  events: [
    { name: 'step-change', description: '步骤切换时触发', params: 'index: number' },
  ],
  slots: [],
  exposes: [
    { name: 'nextStep', type: '() => Promise<void>', description: '切换到下一步（含校验）' },
    { name: 'prevStep', type: '() => void', description: '返回上一步' },
  ],
  schemas: [
    {
      title: '三步表单',
      schema: [
        {
          type: 'steps',
          children: [
            {
              type: 'grid-row',
              props: { stepTitle: '基础信息', stepDescription: '填写基本信息' },
              children: [
                { type: 'grid-col', span: 12, children: [{ type: 'input', field: 'name', label: '姓名' }] },
                { type: 'grid-col', span: 12, children: [{ type: 'input', field: 'email', label: '邮箱' }] },
              ],
            },
            {
              type: 'grid-row',
              props: { stepTitle: '详细信息', stepDescription: '补充详细资料' },
              children: [
                { type: 'grid-col', span: 24, children: [{ type: 'textarea', field: 'detail', label: '详情' }] },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export default doc
