import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'editable-table',
  name: 'FgEditableTable',
  category: 'business',
  description: '可编辑表格组件 — 独占一行的表格布局。自定义表头，列内容可动态配置表单组件（input/number/select/date/textarea）。支持全局校验、动态添加/删除行、序号显示、最大行数限制、斑马纹行背景。',
  exposedValues: [
    { key: 'tableData', type: 'array', description: '当前表格行数据', example: [] },
    { key: 'rowCount', type: 'number', description: '当前行数', example: 0 },
  ],
  receivableEvents: [
    { name: 'add-row', description: '添加一行' },
    { name: 'clear', description: '清空所有行' },
  ],
  props: [
    { name: 'modelValue', type: 'Record<string, unknown>[]', default: '[]', description: '表格行数据（双向绑定）' },
    { name: 'schema', type: 'PartialWidget', default: '—', description: 'editable-table 类型的完整 schema 配置' },
    { name: 'schema.columns', type: 'EditableTableColumn[]', default: '[]', description: '列定义：prop/label/type/placeholder/width/options/rules/required' },
    { name: 'schema.props.maxRows', type: 'number', default: '20', description: '最大行数' },
    { name: 'schema.props.showIndex', type: 'boolean', default: 'true', description: '是否显示序号列' },
    { name: 'schema.props.addButtonText', type: 'string', default: '"添加行"', description: '添加按钮文案' },
  ],
  events: [
    { name: 'update:modelValue', description: '行数据变更时触发', params: 'value: Record<string, unknown>[]' },
  ],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: '项目明细可编辑表格',
      description: '包含名称（input）、分类（select）、单价（number）、日期（date）四列，支持动态添加/删除行。',
      schema: [{
        type: 'editable-table',
        field: 'items',
        label: '项目明细',
        columns: [
          { prop: 'name', label: '名称', type: 'input', placeholder: '请输入名称', width: '200px', required: true, rules: [{ required: true, message: '名称为必填项', trigger: 'blur' }] },
          { prop: 'category', label: '分类', type: 'select', placeholder: '请选择分类', width: '180px', options: [{ label: '电子产品', value: 'electronics' }, { label: '办公用品', value: 'office' }, { label: '耗材', value: 'consumables' }] },
          { prop: 'price', label: '单价', type: 'number', placeholder: '请输入单价', width: '150px' },
          { prop: 'date', label: '日期', type: 'date', placeholder: '请选择日期', width: '200px' },
          { prop: 'remark', label: '备注', type: 'textarea', placeholder: '请输入备注' },
        ],
        props: {
          maxRows: 10,
          showIndex: true,
          addButtonText: '添加行',
        },
      }],
    },
    {
      title: '最小化配置',
      description: '仅包含两列输入框的最简配置，演示默认行为的 editable-table。',
      schema: [{
        type: 'editable-table',
        field: 'simpleItems',
        label: '简单列表',
        columns: [
          { prop: 'key', label: '键', type: 'input', placeholder: '请输入键' },
          { prop: 'value', label: '值', type: 'input', placeholder: '请输入值' },
        ],
        props: {
          showIndex: false,
        },
      }],
    },
  ],
}

export default doc
