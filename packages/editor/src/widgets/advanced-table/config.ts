import type { WidgetConfig, SchemaEventAction, EventTargetConfig, Widget } from '../base/types'
import type { SchemaApiConfig } from '@/components/WidgetRenderer/types'

// ============================================================
// 高级表格类型定义
// ============================================================

/** 行内按钮事件配置 */
export interface ButtonEventConfig {
  trigger: string
  condition?: string
  confirm?: string
  actions: SchemaEventAction[]
}

/** 操作按钮（工具栏 / 行内共用） */
export interface ActionButton {
  key: string
  label: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text'
  icon?: string
  size?: 'small' | 'default'
  confirm?: string
  visibleCondition?: string
  params?: Record<string, unknown>
  events?: ButtonEventConfig[]
}

/** 高级列定义 */
export interface AdvancedTableColumn {
  prop: string
  label: string
  width?: number
  minWidth?: number
  fixed?: 'left' | 'right'
  sortable?: boolean | 'custom'
  align?: 'left' | 'center' | 'right'
  render?: 'text' | 'link' | 'tag' | 'badge' | 'image' | 'buttons' | 'custom'
  // tooltip
  showTooltip?: boolean
  tooltipField?: string
  // link
  linkEvent?: string
  // tag/badge
  colorMap?: Record<string, string>
  options?: Array<{ label: string; value: string | number }>
  api?: SchemaApiConfig
  // image
  imageWidth?: number
  // buttons
  buttons?: ActionButton[]
  // custom
  renderFn?: string
  // filter
  filterable?: boolean
  filters?: Array<{ text: string; value: unknown }>
}

/** 分页配置 */
export interface AdvPaginationConfig {
  enabled: boolean
  pageSize: number
  pageSizes: number[]
}

/** 多选配置 */
export interface AdvSelectionConfig {
  enabled: boolean
}

// ============================================================
// Widget Config
// ============================================================

export const advancedTableConfig: WidgetConfig = {
  name: 'FgAdvancedTable',
  displayName: '高级表格',
  description: '业务数据表格，支持列渲染、行内按钮、工具栏、批量操作、事件绑定、参数传递',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '400px',
  },
  defaultProps: {
    columns: [
      { prop: 'name', label: '姓名', width: 120, render: 'text' },
      { prop: 'status', label: '状态', width: 100, render: 'tag', colorMap: { '启用': 'success', '停用': 'danger' } },
      { prop: 'action', label: '操作', width: 160, fixed: 'right', render: 'buttons', buttons: [
        { key: 'edit', label: '编辑', type: 'primary', size: 'small' },
        { key: 'delete', label: '删除', type: 'danger', size: 'small', confirm: '确认删除？' },
      ] },
    ] as AdvancedTableColumn[],
    toolbar: [
      { key: 'add', label: '新增', type: 'primary', icon: 'plus' },
      { key: 'batchDelete', label: '批量删除', type: 'danger', visibleCondition: 'selectedRows.length > 0' },
    ] as ActionButton[],
    stripe: true,
    border: true,
    height: 350,
    sortable: false,
    pagination: {
      enabled: true,
      pageSize: 20,
      pageSizes: [10, 20, 50, 100],
    } as AdvPaginationConfig,
    selection: {
      enabled: true,
    } as AdvSelectionConfig,
  },
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'tableData', type: 'array', description: '表格数据' },
    { key: 'selectedRows', type: 'array', description: '当前选中的行数据' },
    { key: 'selectedCount', type: 'number', description: '选中行数' },
  ],
  configPanels: ['events', 'api', 'variables'],
  receivableEvents: [
    { name: 'refresh', description: '重新加载表格数据' },
    { name: 'set-data', description: '设置表格数据', params: { data: '数据数组' } },
    { name: 'set-search-params', description: '设置搜索参数', params: { params: '参数对象' } },
    { name: 'clear-selection', description: '清空行选择' },
  ],
  eventTargets: (widget: Widget): EventTargetConfig[] => {
    const targets: EventTargetConfig[] = [
      { id: 'row-click', label: '行点击' },
      { id: 'selection-change', label: '选择变化' },
      { id: 'sort-change', label: '排序变化' },
      { id: 'page-change', label: '翻页' },
    ]
    // 工具栏按钮 → eventTarget: toolbar-{key}
    const toolbar = (widget.props?.toolbar as ActionButton[]) || []
    for (const btn of toolbar) {
      targets.push({ id: `toolbar-${btn.key}`, label: `工具栏: ${btn.label}` })
    }
    // 行内按钮 → eventTarget: row-{key}
    const columns = (widget.props?.columns as AdvancedTableColumn[]) || []
    const seenRowKeys = new Set<string>()
    for (const col of columns) {
      if (col.render === 'buttons' && col.buttons) {
        for (const btn of col.buttons) {
          if (!seenRowKeys.has(btn.key)) {
            seenRowKeys.add(btn.key)
            targets.push({ id: `row-${btn.key}`, label: `行按钮: ${btn.label}` })
          }
        }
      }
      if (col.render === 'link' && col.linkEvent) {
        targets.push({ id: `link-${col.prop}`, label: `链接: ${col.label}` })
      }
    }
    return targets
  },
  propertyPanel: {
    basic: ['label'],
    style: [],
    props: [
      { key: 'columns', label: '列配置', type: 'advanced-columns' },
      { key: 'toolbar', label: '工具栏按钮', type: 'action-buttons' },
      { key: 'selection.enabled', label: '行选择', type: 'switch' },
      { key: 'stripe', label: '斑马纹', type: 'switch' },
      { key: 'border', label: '边框', type: 'switch' },
      { key: 'height', label: '表格高度', type: 'number' },
      { key: 'sortable', label: '全局排序', type: 'switch' },
      { key: 'pagination.enabled', label: '分页', type: 'switch' },
      { key: 'pagination.pageSize', label: '每页条数', type: 'number' },
    ],
  },
}
