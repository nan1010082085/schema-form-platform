// @ts-nocheck
import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'search-list',
  name: 'FgSearchList',
  category: 'business',
  description: '搜索列表组件 — FormGrid 最复杂的业务组件。组合了搜索表单、数据表格、分页器、行操作按钮和导出功能。通过完整的属性面板可视化配置。支持 7 种列渲染模式、4 种行操作类型、CSV/Excel 导出、骨架屏加载态、空状态和错误重试。',
  props: [
    { name: 'schema', type: 'FormSchemaItem', default: '—', description: 'search-list 类型的完整 schema 配置' },
    { name: 'listApi', type: 'ListApiConfig', default: '—', description: '列表查询 API（url/method/pageParam/sizeParam/dataPath/totalPath）' },
    { name: 'searchFields', type: 'SearchFieldSchema[]', default: '[]', description: '搜索字段配置（支持 7 种类型：input/number/select/radio/checkbox/date/date-range）' },
    { name: 'columns', type: 'SearchListColumnSchema[]', default: '[]', description: '表格列定义（7 种渲染：text/tooltip/tag/link/badge/image/custom）' },
    { name: 'rowActions', type: 'SearchListRowAction[]', default: '[]', description: '行操作按钮（4 种类型：emit/api/navigate/dialog）' },
    { name: 'buttons', type: 'SchemaButtonConfig[]', default: '[]', description: '工具栏按钮（8 种动作类型）' },
  ],
  events: [
    { name: 'update:modelValue', description: '行操作触发时 emit（emit 类型）', params: 'event: string, payload?: unknown' },
    { name: 'open-dialog', description: 'dialog 类型行操作触发', params: 'config: {title,width,schema}' },
  ],
  slots: [],
  exposes: [
    { name: 'exportCsv', type: '() => void', description: '导出 CSV' },
    { name: 'exportExcel', type: '() => void', description: '导出 Excel' },
  ],
  schemas: [
    {
      title: '完整搜索列表示例（含弹窗联动）',
      description: '搜索关键词 + 状态下拉 + badge 渲染。行操作支持 emit / dialog / api / navigate 四种类型，其中 dialog 类型可触发弹窗联动。工具栏按钮同样支持 dialog 动作。',
      schema: [{
        type: 'search-list',
        listApi: { url: '/api/orders', method: 'post', pageParam: 'pageNum', sizeParam: 'pageSize', dataPath: 'data', totalPath: 'total' },
        searchFields: [
          { type: 'input', field: 'keyword', label: '关键词', span: 8 },
          { type: 'select', field: 'status', label: '状态', span: 8, options: [{ label: '已支付', value: 'paid' }, { label: '未支付', value: 'unpaid' }] },
          { type: 'date-range', field: 'dateRange', label: '日期', span: 8 },
        ],
        columns: [
          { prop: 'id', label: '订单号', render: 'text', width: '120' },
          { prop: 'status', label: '状态', render: 'badge', colorMap: { paid: '#67c23a', unpaid: '#f56c6c' } },
          { prop: 'amount', label: '金额', render: 'text', align: 'right' },
        ],
        rowActions: [
          { label: '查看', buttonType: 'primary', type: 'emit', emitEvent: 'view' },
          { label: '编辑', buttonType: 'warning', type: 'dialog', dialogTitle: '编辑订单', dialogSchema: [{ type: 'input', field: 'remark', label: '备注' }] },
          { label: '删除', buttonType: 'danger', type: 'api', apiUrl: '/api/orders/:id', apiMethod: 'post', confirm: '确认删除？' },
        ],
        buttons: [
          { text: '新增', buttonType: 'primary', actions: [{ type: 'dialog', dialogTitle: '新增', dialogSchema: [{ type: 'input', field: 'name', label: '名称' }] }] },
          { text: '导出 CSV', buttonType: 'default', actions: [{ type: 'emit', eventName: 'export', eventPayload: { format: 'csv' } }] },
        ],
      }],
    },
  ],
}

export default doc
