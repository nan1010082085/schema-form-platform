// @ts-nocheck
import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'button-list',
  name: 'FgSchemaButtonList',
  category: 'business',
  description: 'Schema 驱动按钮组。通过 SchemaButtonConfig[] 定义按钮，支持 actions 动作链（submit/validate/api/emit/navigate/reset/dialog）。',
  props: [
    { name: 'buttons', type: 'SchemaButtonConfig[]', default: '[]', description: '按钮配置数组' }
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '基础用法',
      description: '按钮 + 动作链：validate + submit / confirm + api / confirm + reset',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '姓名', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'input', field: 'ba_name', props: { placeholder: '请输入姓名' } }] },
            { type: 'grid-col', span: 4, label: '部门', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'input', field: 'ba_dept', props: { placeholder: '请输入部门' } }] }
          ]
        },
        {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col', span: 24, align: 'center',
              children: [
                {
                  type: 'button-list',
                  buttons: [
                    { text: '提交', buttonType: 'primary', actions: [{ type: 'validate' }, { type: 'submit' }] },
                    { text: '调用 API', buttonType: 'primary', actions: [{ type: 'confirm', confirm: '确认提交数据？' }, { type: 'api', apiUrl: '/api/save', apiMethod: 'post', apiParams: 'formData' }] },
                    { text: '重置', actions: [{ type: 'confirm', confirm: '确认重置表单？' }, { type: 'reset' }] }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      title: '弹窗动作 — dialog 类型',
      description: '按钮配置 dialog 动作类型，点击后打开弹窗。dialog 动作可与其他动作组合形成动作链（如 validate → dialog → submit）',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '任务名称', align: 'center' },
            { type: 'grid-col', span: 8, children: [{ type: 'input', field: 'ba_task', props: { placeholder: '请输入任务名称' } }] },
            { type: 'grid-col', span: 4, label: '优先级', align: 'center' },
            {
              type: 'grid-col', span: 8,
              children: [{
                type: 'select', field: 'ba_priority',
                options: [
                  { label: '高', value: 'high' },
                  { label: '中', value: 'medium' },
                  { label: '低', value: 'low' }
                ],
                props: { placeholder: '请选择优先级' }
              }]
            }
          ]
        },
        {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col', span: 24, align: 'center',
              children: [
                {
                  type: 'button-list',
                  buttons: [
                    {
                      text: '新建任务',
                      buttonType: 'primary',
                      actions: [
                        {
                          type: 'dialog',
                          dialogTitle: '新建任务',
                          dialogWidth: '600px',
                          dialogSchema: [
                            {
                              type: 'grid-row',
                              children: [
                                { type: 'grid-col', span: 6, label: '任务名称', align: 'center' },
                                { type: 'grid-col', span: 18, children: [{ type: 'input', field: 'dialog_task', props: { placeholder: '请输入任务名称' } }] }
                              ]
                            },
                            {
                              type: 'grid-row',
                              children: [
                                { type: 'grid-col', span: 6, label: '截止日期', align: 'center' },
                                { type: 'grid-col', span: 18, children: [{ type: 'date', field: 'dialog_deadline', props: { placeholder: '请选择截止日期' } }] }
                              ]
                            }
                          ]
                        },
                        { type: 'confirm', confirm: '确认创建该任务？' },
                        { type: 'submit' }
                      ]
                    },
                    {
                      text: '查看详情',
                      actions: [
                        {
                          type: 'dialog',
                          dialogTitle: '任务详情',
                          dialogWidth: '500px',
                          dialogSchema: [
                            {
                              type: 'grid-row',
                              children: [
                                { type: 'grid-col', span: 8, label: '当前任务', align: 'center' },
                                { type: 'grid-col', span: 16, children: [{ type: 'input', field: 'detail_info', props: { placeholder: '暂无数据', disabled: true } }] }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

export default doc
