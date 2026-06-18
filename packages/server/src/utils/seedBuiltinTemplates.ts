import { v4 as uuidv4 } from 'uuid'
import { WidgetTemplateModel } from '../models/WidgetTemplate.js'

interface BuiltinTemplate {
  name: string
  description: string
  category: 'form' | 'layout' | 'table' | 'search' | 'chart' | 'business' | 'report' | 'other'
  tags: string[]
  widgets: Record<string, unknown>[]
}

const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    name: '用户注册表单',
    description: '包含用户名、邮箱、手机号、密码的标准注册表单',
    category: 'form',
    tags: ['用户', '注册', '基础'],
    widgets: [
      { id: uuidv4(), type: 'input', props: { label: '用户名', placeholder: '请输入用户名', required: true, field: 'username' }, position: { x: 50, y: 50, w: 400, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'input', props: { label: '邮箱', placeholder: '请输入邮箱', required: true, field: 'email' }, position: { x: 50, y: 120, w: 400, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'input', props: { label: '手机号', placeholder: '请输入手机号', required: false, field: 'phone' }, position: { x: 50, y: 190, w: 400, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'input', props: { label: '密码', placeholder: '请输入密码', required: true, field: 'password', inputType: 'password' }, position: { x: 50, y: 260, w: 400, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'button', props: { label: '注册', type: 'primary' }, position: { x: 50, y: 340, w: 400, h: 50, zIndex: 1 } },
    ],
  },
  {
    name: '订单查询表单',
    description: '订单号、状态、日期范围的查询筛选表单',
    category: 'search',
    tags: ['订单', '查询', '筛选'],
    widgets: [
      { id: uuidv4(), type: 'input', props: { label: '订单号', placeholder: '请输入订单号', field: 'orderId' }, position: { x: 50, y: 50, w: 300, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'select', props: { label: '订单状态', placeholder: '请选择状态', field: 'status', options: [{ label: '待付款', value: 'pending' }, { label: '已付款', value: 'paid' }, { label: '已完成', value: 'completed' }, { label: '已取消', value: 'cancelled' }] }, position: { x: 370, y: 50, w: 300, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'date', props: { label: '开始日期', field: 'startDate' }, position: { x: 50, y: 120, w: 300, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'date', props: { label: '结束日期', field: 'endDate' }, position: { x: 370, y: 120, w: 300, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'button', props: { label: '查询', type: 'primary' }, position: { x: 50, y: 200, w: 140, h: 44, zIndex: 1 } },
      { id: uuidv4(), type: 'button', props: { label: '重置', type: 'default' }, position: { x: 210, y: 200, w: 140, h: 44, zIndex: 1 } },
    ],
  },
  {
    name: '员工信息表单',
    description: '员工基本信息录入表单，包含姓名、部门、职位等',
    category: 'form',
    tags: ['员工', 'HR', '信息录入'],
    widgets: [
      { id: uuidv4(), type: 'input', props: { label: '姓名', placeholder: '请输入姓名', required: true, field: 'name' }, position: { x: 50, y: 50, w: 400, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'select', props: { label: '性别', field: 'gender', options: [{ label: '男', value: 'male' }, { label: '女', value: 'female' }] }, position: { x: 50, y: 120, w: 400, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'date', props: { label: '出生日期', field: 'birthday' }, position: { x: 50, y: 190, w: 400, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'input', props: { label: '部门', placeholder: '请输入部门', field: 'department' }, position: { x: 50, y: 260, w: 400, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'input', props: { label: '职位', placeholder: '请输入职位', field: 'position' }, position: { x: 50, y: 330, w: 400, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'input', props: { label: '邮箱', placeholder: '请输入邮箱', field: 'email' }, position: { x: 50, y: 400, w: 400, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'button', props: { label: '保存', type: 'primary' }, position: { x: 50, y: 480, w: 400, h: 50, zIndex: 1 } },
    ],
  },
  {
    name: '用户列表',
    description: '标准用户管理列表，包含姓名、邮箱、角色、状态等列',
    category: 'table',
    tags: ['用户', '列表', '管理'],
    widgets: [
      { id: uuidv4(), type: 'table', props: {
        columns: [
          { prop: 'name', label: '姓名', width: 120 },
          { prop: 'email', label: '邮箱', width: 200 },
          { prop: 'phone', label: '手机号', width: 140 },
          { prop: 'role', label: '角色', width: 100 },
          { prop: 'status', label: '状态', width: 80 },
          { prop: 'createdAt', label: '创建时间', width: 160 },
        ],
        stripe: true,
        border: true,
        height: 400,
        pagination: { enabled: true, pageSize: 20, pageSizes: [10, 20, 50] },
      }, position: { x: 50, y: 50, w: 900, h: 450, zIndex: 1 } },
    ],
  },
  {
    name: '订单列表',
    description: '订单数据表格，包含订单号、金额、状态、时间等',
    category: 'table',
    tags: ['订单', '列表', '交易'],
    widgets: [
      { id: uuidv4(), type: 'table', props: {
        columns: [
          { prop: 'orderNo', label: '订单号', width: 180 },
          { prop: 'customer', label: '客户', width: 120 },
          { prop: 'amount', label: '金额', width: 100 },
          { prop: 'status', label: '状态', width: 100 },
          { prop: 'payMethod', label: '支付方式', width: 120 },
          { prop: 'createdAt', label: '下单时间', width: 160 },
        ],
        stripe: true,
        border: true,
        height: 400,
        pagination: { enabled: true, pageSize: 20, pageSizes: [10, 20, 50] },
      }, position: { x: 50, y: 50, w: 900, h: 450, zIndex: 1 } },
    ],
  },
  {
    name: '操作日志列表',
    description: '系统操作日志表格，包含操作人、操作类型、时间、IP 等',
    category: 'table',
    tags: ['日志', '审计', '操作记录'],
    widgets: [
      { id: uuidv4(), type: 'table', props: {
        columns: [
          { prop: 'operator', label: '操作人', width: 100 },
          { prop: 'action', label: '操作类型', width: 120 },
          { prop: 'module', label: '模块', width: 100 },
          { prop: 'detail', label: '操作详情', width: 240 },
          { prop: 'ip', label: 'IP 地址', width: 140 },
          { prop: 'createdAt', label: '操作时间', width: 160 },
        ],
        stripe: true,
        border: true,
        height: 400,
        pagination: { enabled: true, pageSize: 20, pageSizes: [10, 20, 50, 100] },
      }, position: { x: 50, y: 50, w: 900, h: 450, zIndex: 1 } },
    ],
  },
  {
    name: '反馈意见表单',
    description: '用户反馈收集表单，包含反馈类型、内容、附件',
    category: 'form',
    tags: ['反馈', '意见', '客服'],
    widgets: [
      { id: uuidv4(), type: 'select', props: { label: '反馈类型', required: true, field: 'type', options: [{ label: '功能建议', value: 'feature' }, { label: 'Bug 报告', value: 'bug' }, { label: '体验问题', value: 'ux' }, { label: '其他', value: 'other' }] }, position: { x: 50, y: 50, w: 400, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'input', props: { label: '标题', placeholder: '请简要描述问题', required: true, field: 'title' }, position: { x: 50, y: 120, w: 400, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'textarea', props: { label: '详细描述', placeholder: '请详细描述您的反馈...', required: true, field: 'content', rows: 5 }, position: { x: 50, y: 190, w: 400, h: 140, zIndex: 1 } },
      { id: uuidv4(), type: 'input', props: { label: '联系方式', placeholder: '手机号或邮箱（选填）', field: 'contact' }, position: { x: 50, y: 340, w: 400, h: 60, zIndex: 1 } },
      { id: uuidv4(), type: 'button', props: { label: '提交反馈', type: 'primary' }, position: { x: 50, y: 420, w: 400, h: 50, zIndex: 1 } },
    ],
  },
]

/**
 * 在启动时注入内置模板（幂等：已存在则跳过）
 */
export async function seedBuiltinTemplates(): Promise<void> {
  const existingCount = await WidgetTemplateModel.countDocuments({ isBuiltin: true })
  if (existingCount >= BUILTIN_TEMPLATES.length) return

  for (const tpl of BUILTIN_TEMPLATES) {
    const existing = await WidgetTemplateModel.findOne({ name: tpl.name, isBuiltin: true })
    if (existing) continue

    await WidgetTemplateModel.create({
      _id: uuidv4(),
      name: tpl.name,
      description: tpl.description,
      category: tpl.category,
      widgets: tpl.widgets,
      tags: tpl.tags,
      isBuiltin: true,
      usageCount: 0,
    })
  }
  console.log('[seed] Builtin templates ensured')
}
