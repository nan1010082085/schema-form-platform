import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'linkage',
  name: '字段联动',
  category: 'business',
  description:
    'Schema 驱动的字段联动机制，支持 visible / disabled / required / options / set-value / reset-fields 六种联动类型。',
  author: 'yangdongnan' +
    '通过在 PartialWidget 上配置 linkages 数组，可以实现字段间的条件联动。' +
    '条件表达式可引用 values (表单数据)、variables (用户变量)、exposed (组件暴露值)。',
  props: [
    {
      name: 'linkages',
      type: 'SchemaLinkage[]',
      default: '—',
      description: '联动配置数组，每个元素定义一种联动行为',
    },
    {
      name: 'linkages[].type',
      type: '"visible" | "disabled" | "required" | "options" | "set-value" | "reset-fields"',
      default: '—',
      description: '联动类型',
    },
    {
      name: 'linkages[].watchFields',
      type: 'string[]',
      default: '—',
      description: '监听的字段列表，任一字段变化时触发联动',
    },
    {
      name: 'linkages[].condition',
      type: 'string | ((values: Record<string, FormFieldValue>) => boolean)',
      default: '—',
      description: '联动条件，支持字符串表达式或函数。可引用 values / variables / exposed',
    },
    {
      name: 'linkages[].thenOptions',
      type: 'DictItem[]',
      default: '—',
      description: 'options 联动时，条件为真的静态选项',
    },
    {
      name: 'linkages[].thenApi',
      type: 'SchemaApiConfig',
      default: '—',
      description: 'options 联动时，条件为真的动态 API 配置',
    },
    {
      name: 'linkages[].thenValue',
      type: 'FieldValue',
      default: '—',
      description: 'set-value 联动时，条件为真时设置的字面值',
    },
    {
      name: 'linkages[].valueSource',
      type: 'string',
      default: '—',
      description: 'set-value 联动时，条件为真时从该字段复制值',
    },
    {
      name: 'linkages[].targetFields',
      type: 'string[]',
      default: '—',
      description: 'reset-fields 联动时，要重置的目标字段列表',
    },
    {
      name: 'linkages[].elseValue',
      type: 'FieldValue',
      default: '—',
      description: '条件为假时的回退值',
    },
  ],
  events: [],
  slots: [],
  exposes: [],
  schemas: [
    {
      title: 'visible 联动 — 条件显隐',
      description: '当类型选择"高级"时，显示高级配置字段',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '配置类型', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'select',
                  field: 'linkage_type',
                  options: [
                    { label: '基础', value: 'basic' },
                    { label: '高级', value: 'advanced' },
                  ],
                  props: { placeholder: '请选择配置类型' },
                },
              ],
            },
            { type: 'grid-col', span: 4, label: '超时时间', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'number',
                  field: 'linkage_timeout',
                  props: { placeholder: '秒' },
                  linkages: [
                    {
                      type: 'visible',
                      watchFields: ['linkage_type'],
                      condition: 'values.linkage_type === "advanced"',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'disabled 联动 — 条件禁用',
      description: '当审批类型为"常规"时，禁用原因字段',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '审批类型', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'radio',
                  field: 'linkage_approvalType',
                  options: [
                    { label: '常规', value: 'normal' },
                    { label: '加急', value: 'urgent' },
                  ],
                },
              ],
            },
            { type: 'grid-col', span: 4, label: '加急原因', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'textarea',
                  field: 'linkage_reason',
                  props: { placeholder: '请输入加急原因' },
                  linkages: [
                    {
                      type: 'disabled',
                      watchFields: ['linkage_approvalType'],
                      condition: 'values.linkage_approvalType === "normal"',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'required 联动 — 条件必填',
      description: '当"有无车辆"选择"有"时，车牌号变为必填',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '有无车辆', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'radio',
                  field: 'linkage_hasCar',
                  options: [
                    { label: '有', value: 'yes' },
                    { label: '无', value: 'no' },
                  ],
                },
              ],
            },
            { type: 'grid-col', span: 4, label: '车牌号', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'input',
                  field: 'linkage_plateNumber',
                  props: { placeholder: '请输入车牌号' },
                  linkages: [
                    {
                      type: 'required',
                      watchFields: ['linkage_hasCar'],
                      condition: 'values.linkage_hasCar === "yes"',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'options 联动 — 级联选项',
      description: '根据省份选择动态切换城市选项',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '省份', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'select',
                  field: 'linkage_province',
                  options: [
                    { label: '请选择', value: '' },
                    { label: '广东省', value: 'guangdong' },
                    { label: '浙江省', value: 'zhejiang' },
                  ],
                  props: { placeholder: '请选择省份' },
                },
              ],
            },
            { type: 'grid-col', span: 4, label: '城市', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'select',
                  field: 'linkage_city',
                  options: [{ label: '请先选择省份', value: '' }],
                  props: { placeholder: '请选择城市' },
                  linkages: [
                    {
                      type: 'options',
                      watchFields: ['linkage_province'],
                      condition: 'values.linkage_province === "guangdong"',
                      thenOptions: [
                        { label: '广州', value: 'guangzhou' },
                        { label: '深圳', value: 'shenzhen' },
                        { label: '东莞', value: 'dongguan' },
                      ],
                    },
                    {
                      type: 'options',
                      watchFields: ['linkage_province'],
                      condition: 'values.linkage_province === "zhejiang"',
                      thenOptions: [
                        { label: '杭州', value: 'hangzhou' },
                        { label: '宁波', value: 'ningbo' },
                        { label: '温州', value: 'wenzhou' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: '多字段联合联动',
      description: '当角色为经理且级别>=5时，显示审批人字段',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '角色', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'select',
                  field: 'linkage_role',
                  options: [
                    { label: '员工', value: 'staff' },
                    { label: '经理', value: 'manager' },
                    { label: '总监', value: 'director' },
                  ],
                },
              ],
            },
            { type: 'grid-col', span: 4, label: '级别', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'number',
                  field: 'linkage_level',
                  props: { min: 1, max: 10 },
                },
              ],
            },
            { type: 'grid-col', span: 4, label: '审批人', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'input',
                  field: 'linkage_approver',
                  props: { placeholder: '请输入审批人' },
                  linkages: [
                    {
                      type: 'visible',
                      watchFields: ['linkage_role', 'linkage_level'],
                      condition:
                        'values.linkage_role === "manager" && values.linkage_level >= 5',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'set-value 联动 — 条件设值',
      description: '当折扣类型选择 VIP 时，自动设置折扣率为 0.8',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '折扣类型', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'select',
                  field: 'linkage_discountType',
                  options: [
                    { label: '普通', value: 'normal' },
                    { label: 'VIP', value: 'vip' },
                  ],
                },
              ],
            },
            { type: 'grid-col', span: 4, label: '折扣率', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'number',
                  field: 'linkage_discountRate',
                  props: { min: 0, max: 1, step: 0.1 },
                  linkages: [
                    {
                      type: 'set-value',
                      watchFields: ['linkage_discountType'],
                      condition: 'values.linkage_discountType === "vip"',
                      thenValue: 0.8,
                      elseValue: 1,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'reset-fields 联动 — 条件重置',
      description: '当分类切换为非"自定义"时，重置自定义名称和价格字段',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '分类', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'select',
                  field: 'linkage_category',
                  options: [
                    { label: '标准', value: 'standard' },
                    { label: '自定义', value: 'custom' },
                  ],
                  linkages: [
                    {
                      type: 'reset-fields',
                      watchFields: ['linkage_category'],
                      condition: 'values.linkage_category !== "custom"',
                      targetFields: ['linkage_customName', 'linkage_customPrice'],
                    },
                  ],
                },
              ],
            },
            { type: 'grid-col', span: 4, label: '自定义名称', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'input',
                  field: 'linkage_customName',
                  props: { placeholder: '仅自定义分类可编辑' },
                },
              ],
            },
            { type: 'grid-col', span: 4, label: '自定义价格', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'number',
                  field: 'linkage_customPrice',
                  props: { placeholder: '仅自定义分类可编辑' },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: '变量引用联动 — 使用 variables',
      description: '条件表达式中引用画布/组件变量，实现跨组件联动',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '管理员面板', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                {
                  type: 'input',
                  field: 'linkage_adminNote',
                  props: { placeholder: '仅管理员可见' },
                  linkages: [
                    {
                      type: 'visible',
                      watchFields: [],
                      condition: 'variables.isAdmin === true',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export default doc
