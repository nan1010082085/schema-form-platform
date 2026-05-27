/**
 * FormGrid 中文语言包
 * key 命名规范：component.action.description
 */
const zhCN: Record<string, string> = {
  // ---- 表格 FgTable ----
  'table.emptyText': '暂无数据',
  'table.index': '序号',
  'table.action': '操作',
  'table.action.add': '新增',
  'table.action.copy': '复制',
  'table.action.delete': '删除',
  'table.confirm.title': '提示',
  'table.confirm.confirm': '确定',
  'table.confirm.cancel': '取消',
  'table.validate.notEmpty': '{label}不能为空',
  'table.validate.invalidFormat': '{label}格式不正确',

  // ---- 分页 FgPagination ----
  'pagination.total': '共 {total} 条',
  'pagination.jumper': '前往',
  'pagination.page': '页',

  // ---- 步骤导航 FgSteps ----
  'steps.prev': '上一步',
  'steps.next': '下一步',
  'steps.validate.warning': '请先完成当前步骤的必填项',

  // ---- 通用校验 ----
  'validation.required': '请填写{label}',

  // ---- 通用确认 ----
  'confirm.delete': '确认删除{name}？',
  'confirm.action': '确认执行此操作？',

  // ---- 加载/错误 ----
  'message.loadFailed': '数据加载失败',
  'message.transformFailed': '数据转换失败',
}

export default zhCN
