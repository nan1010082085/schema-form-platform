import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'linkage',
  name: '字段联动',
  category: 'business',
  description:
    'Schema 驱动的字段联动机制，支持 visible / disabled / required / options 四种联动类型。' +
    '通过在 FormSchemaItem 上配置 linkages 数组，可以实现字段间的条件联动。',
  props: [
    {
      name: 'linkages',
      type: 'SchemaLinkage[]',
      default: '—',
      description: '联动配置数组，每个元素定义一种联动行为',
    },
    {
      name: 'linkages[].type',
      type: '"visible" | "disabled" | "required" | "options"',
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
      description: '联动条件，支持字符串表达式或函数',
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
  ],
}

export default doc
