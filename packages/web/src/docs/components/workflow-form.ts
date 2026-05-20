import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'workflow-form',
  name: 'FgWorkflowForm',
  category: 'business',
  description: '流程表单容器。提供工具栏（返回/打印/保存/发送）、内容区和审批意见区，支持工作流引擎集成。',
  props: [
    { name: 'title', type: 'string', default: 'undefined', description: '工具栏标题文本' },
    { name: 'showToolbar', type: 'boolean', default: 'true', description: '是否显示顶部工具栏' },
    { name: 'showOpinions', type: 'boolean', default: 'false', description: '是否显示审批意见区' },
    { name: 'opinions', type: 'OpinionItem[]', default: '[]', description: '审批意见列表数据' },
    { name: 'opinionEditable', type: 'boolean', default: 'false', description: '是否允许填写新的审批意见' },
  ],
  events: [
    { name: 'save', description: '点击保存按钮时触发', params: '无' },
    { name: 'submit', description: '点击发送按钮时触发', params: '无' },
    { name: 'back', description: '点击返回按钮时触发', params: '无' },
    { name: 'print', description: '点击打印按钮时触发', params: '无' },
    { name: 'save-opinion', description: '提交审批意见时触发', params: 'content: string' },
  ],
  slots: [
    { name: 'default', description: '表单内容区域' },
    { name: 'toolbar-actions', description: '自定义工具栏按钮区域，替换默认的返回/打印/保存/发送按钮' },
  ],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      description: '作为流程表单的顶层容器，包裹表单内容',
      schema: [
        {
          type: 'page',
          children: [
            {
              type: 'card',
              children: [
                {
                  type: 'grid-row',
                  children: [
                    { type: 'grid-col', span: 4, label: '申请人', align: 'center' },
                    { type: 'grid-col', span: 8, children: [{ type: 'input', field: 'wf_applicant', props: { placeholder: '请输入申请人' } }] },
                    { type: 'grid-col', span: 4, label: '部门', align: 'center' },
                    { type: 'grid-col', span: 8, children: [{ type: 'input', field: 'wf_dept', props: { placeholder: '请输入部门' } }] },
                  ],
                },
                {
                  type: 'grid-row',
                  children: [
                    { type: 'grid-col', span: 4, label: '申请事由', align: 'center' },
                    { type: 'grid-col', span: 20, children: [{ type: 'textarea', field: 'wf_reason', props: { placeholder: '请输入申请事由', rows: 4 } }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export default doc
