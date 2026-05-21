import type { WidgetConfig } from '../base/types'
export interface TableColumn {
  prop: string
  label: string
  width?: number
  fixed?: 'left' | 'right'
}

export const tableConfig: WidgetConfig = {
  name: 'FgTable',
  displayName: '表格',
  defaultStyle: {
    width: '100%',
    height: '300px',
  },
  defaultProps: {
    columns: [
      { prop: 'name', label: '姓名', width: 120 },
      { prop: 'age', label: '年龄', width: 80 },
    ] as TableColumn[],
    stripe: true,
    border: true,
    height: 280,
    apiUrl: '',
    apiMethod: 'get',
    apiHeaders: {} as Record<string, string>,
    responseDataPath: '',
  },
  configPanels: ['api'],
  propertyPanel: {
    basic: ['label'],
    style: [],
    props: [
      { key: 'columns', label: '列配置', type: 'columns' },
      { key: 'stripe', label: '斑马纹', type: 'switch' },
      { key: 'border', label: '边框', type: 'switch' },
      { key: 'height', label: '表格高度', type: 'number' },
    ],
  },
}
