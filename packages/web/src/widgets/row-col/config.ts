import type { WidgetConfig } from '../base/types'
export const rowColConfig: WidgetConfig = {
  name: 'FgRowCol',
  displayName: '行列容器',
  description: '行列容器，使用 el-row + el-col 布局，支持 1-4 列选择',
  defaultStyle: {
    width: '100%',
    height: '44px',
  },
  defaultProps: {
    columns: 2,
    gutter: 16,
  },
  propertyPanel: {
    basic: [
      {
        key: 'columns',
        label: '列数',
        type: 'select',
        options: [
          { label: '1 列', value: 1 },
          { label: '2 列', value: 2 },
          { label: '3 列', value: 3 },
          { label: '4 列', value: 4 },
        ],
        default: 2,
      },
      { key: 'gutter', label: '列间距', type: 'number', default: 16 },
    ],
    style: ['margin', 'padding'],
    props: [],
  },
}
