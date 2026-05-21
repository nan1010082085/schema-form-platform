import type { WidgetConfig } from '../base/types'
export interface ButtonItem {
  text: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | ''
  icon?: string
}

export const buttonListConfig: WidgetConfig = {
  name: 'FgButtonList',
  displayName: '按钮列表',
  description: '按钮列表，支持提交、重置等操作按钮组合',
  defaultStyle: {
    width: '240px',
    fontSize: '14px',
  },
  defaultProps: {
    buttons: [
      { text: '按钮一', type: 'primary' },
      { text: '按钮二', type: '' },
    ] as ButtonItem[],
    disabled: false,
  },
  configPanels: ['events'],
  propertyPanel: {
    basic: ['field', 'label'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      {
        key: 'buttons',
        label: '按钮列表',
        type: 'array-editor',
        default: [],
        fields: [
          { key: 'text', label: '文本', type: 'text', placeholder: '按钮文字' },
          {
            key: 'type',
            label: '类型',
            type: 'select',
            options: [
              { label: '默认', value: '' },
              { label: '主要', value: 'primary' },
              { label: '成功', value: 'success' },
              { label: '警告', value: 'warning' },
              { label: '危险', value: 'danger' },
              { label: '信息', value: 'info' },
            ],
            default: '',
          },
        ],
      },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
    ],
  },
}
