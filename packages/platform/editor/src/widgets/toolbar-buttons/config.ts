import type { WidgetConfig, Widget, EventTargetConfig } from '../base/types'
export interface ToolbarButtonItem {
  text: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | ''
  icon?: string
}

export const toolbarButtonsConfig: WidgetConfig = {
  name: 'FgToolbarButtons',
  displayName: '工具栏按钮',
  description: '工具栏按钮组，用于操作栏按钮排列',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    fontSize: '14px',
  },
  defaultProps: {
    buttons: [
      { text: '查询', type: 'primary' },
      { text: '重置', type: '' },
    ] as ToolbarButtonItem[],
    disabled: false,
  },
  configPanels: ['events'],
  eventTargets: (widget: Widget): EventTargetConfig[] => {
    const btns = (widget.props?.buttons as ToolbarButtonItem[]) || []
    return btns.map((btn, idx) => ({
      id: `btn-${idx}`,
      label: btn.text || `按钮 ${idx + 1}`,
    }))
  },
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
