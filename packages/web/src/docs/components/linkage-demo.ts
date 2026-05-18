// @ts-nocheck
/**
 * 联动配置示例 Schema — 覆盖 6 种联动类型 + 复杂交互模式
 *
 * 模式展示:
 * 1. Checkbox 多选 → 联动单字段显示/隐藏
 * 2. Select 切换 → 选项联动（省→市→区三级）
 * 3. set-value 字段值复制
 * 4. reset-fields 多字段批量重置
 * 5. 多字段联合条件（role + level → approval字段）
 */
export const linkageDemoSchema: import('@/components/FormGrid/types').FormSchemaItem[] = [
  // ---- 多选联动触发源 ----
  {
    type: 'checkbox',
    field: 'features',
    label: '功能选择',
    options: [
      { label: '高级审批', value: 'advanced' },
      { label: '加急处理', value: 'urgent' },
      { label: '国际订单', value: 'international' },
    ],
  },

  // ---- ① visible: checkbox勾选"高级审批"时显示审批人 ----
  {
    type: 'person-select',
    field: 'approver',
    label: '审批人',
    linkages: [
      {
        type: 'visible',
        watchFields: ['features'],
        condition: (v) => Array.isArray(v.features) && v.features.includes('advanced'),
        elseValue: undefined, // 隐藏时清空
      },
      {
        type: 'required',
        watchFields: ['features'],
        condition: (v) => Array.isArray(v.features) && v.features.includes('advanced'),
      },
    ],
  },

  // ---- ② set-value: 勾选"加急"时自动设置优先级 ----
  {
    type: 'select',
    field: 'priority',
    label: '优先级',
    options: [
      { label: '普通', value: 'normal' },
      { label: '高', value: 'high' },
      { label: '紧急', value: 'urgent' },
    ],
    linkages: [
      {
        type: 'set-value',
        watchFields: ['features'],
        condition: (v) => Array.isArray(v.features) && v.features.includes('urgent'),
        thenValue: 'urgent',
        elseValue: 'normal',
      },
    ],
  },

  // ---- ③ disabled: 勾选"国际"时禁用国内物流字段 ----
  {
    type: 'select',
    field: 'shippingMethod',
    label: '物流方式',
    options: [
      { label: '国内快递', value: 'domestic' },
      { label: '国际快递', value: 'international' },
    ],
    linkages: [
      {
        type: 'disabled',
        watchFields: ['features'],
        condition: (v) => Array.isArray(v.features) && v.features.includes('international'),
      },
      {
        type: 'set-value',
        watchFields: ['features'],
        condition: (v) => Array.isArray(v.features) && v.features.includes('international'),
        thenValue: 'international',
      },
    ],
  },

  // ---- ④ 省市区三级联动 ----
  {
    type: 'select',
    field: 'province',
    label: '省份',
    options: [
      { label: '广东', value: 'gd' },
      { label: '浙江', value: 'zj' },
    ],
  },
  {
    type: 'select',
    field: 'city',
    label: '城市',
    linkages: [
      {
        type: 'options',
        watchFields: ['province'],
        condition: 'values.province === "gd"',
        thenOptions: [
          { label: '广州', value: 'gz' },
          { label: '深圳', value: 'sz' },
        ],
        elseValue: '',
      },
      {
        type: 'options',
        watchFields: ['province'],
        condition: 'values.province === "zj"',
        thenOptions: [
          { label: '杭州', value: 'hz' },
          { label: '宁波', value: 'nb' },
        ],
        elseValue: '',
      },
    ],
  },
  {
    type: 'select',
    field: 'district',
    label: '区/县',
    linkages: [
      {
        type: 'options',
        watchFields: ['city'],
        condition: 'values.city === "gz"',
        thenOptions: [
          { label: '天河', value: 'th' },
          { label: '越秀', value: 'yx' },
        ],
        elseValue: '',
      },
      {
        type: 'options',
        watchFields: ['city'],
        condition: 'values.city === "hz"',
        thenOptions: [
          { label: '西湖', value: 'xh' },
          { label: '滨江', value: 'bj' },
        ],
        elseValue: '',
      },
    ],
  },

  // ---- ⑤ reset-fields: 模式切换时批量重置 ----
  {
    type: 'radio',
    field: 'orderMode',
    label: '订单模式',
    defaultValue: 'standard',
    options: [
      { label: '标准模式', value: 'standard' },
      { label: '快速模式', value: 'fast' },
    ],
    linkages: [
      {
        type: 'reset-fields',
        watchFields: ['orderMode'],
        condition: 'values.orderMode === "fast"',
        targetFields: ['customNote', 'additionalApprover', 'ccList'],
      },
    ],
  },
  {
    type: 'textarea',
    field: 'customNote',
    label: '自定义备注',
    defaultValue: '',
  },
  {
    type: 'input',
    field: 'additionalApprover',
    label: '加签人',
    defaultValue: '',
  },
  {
    type: 'input',
    field: 'ccList',
    label: '抄送人',
    defaultValue: '',
  },

  // ---- ⑥ 多字段联合条件 ----
  {
    type: 'select',
    field: 'role',
    label: '角色',
    options: [
      { label: '员工', value: 'staff' },
      { label: '经理', value: 'manager' },
    ],
  },
  {
    type: 'number',
    field: 'level',
    label: '级别',
    defaultValue: 1,
  },
  {
    type: 'input',
    field: 'approvalLimit',
    label: '审批额度',
    linkages: [
      {
        type: 'visible',
        watchFields: ['role', 'level'],
        condition: 'values.role === "manager" && Number(values.level) >= 5',
      },
      {
        type: 'required',
        watchFields: ['role', 'level'],
        condition: 'values.role === "manager" && Number(values.level) >= 5',
      },
    ],
  },
]
