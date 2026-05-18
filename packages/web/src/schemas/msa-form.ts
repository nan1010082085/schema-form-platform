import type { FormSchemaItem, SchemaButtonConfig } from '@/components/FormGrid'

export interface MsaFormModeButtons {
  add?: SchemaButtonConfig[]
  edit?: SchemaButtonConfig[]
  detail?: SchemaButtonConfig[]
}

export interface MsaFormSchemaConfig {
  title: string
  buttons: MsaFormModeButtons
  schema: FormSchemaItem[]
}

// ============================================================
// 通用按钮配置
// ============================================================
const defaultButtons = (_entityName: string): MsaFormModeButtons => ({
  add: [
    { text: '提交', buttonType: 'primary', actions: [{ type: 'submit' }] },
    { text: '保存草稿', actions: [{ type: 'submit' }] },
    { text: '返回', actions: [{ type: 'navigate', navigatePath: '-1' }] }
  ],
  edit: [
    { text: '保存', buttonType: 'primary', actions: [{ type: 'submit' }] },
    { text: '返回', actions: [{ type: 'navigate', navigatePath: '-1' }] }
  ],
  detail: [
    { text: '编辑', buttonType: 'primary', actions: [{ type: 'navigate', navigatePath: './edit' }] },
    { text: '返回', actions: [{ type: 'navigate', navigatePath: '-1' }] }
  ]
})

// ============================================================
// 1. 船舶设备登记表
// ============================================================
const shipEquipmentSchema: FormSchemaItem[] = [
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '是否存在设备编号', span: 8,
        children: [{ type: 'radio', field: 'hasEquipmentNo', options: [{ label: '是', value: 1 }, { label: '否', value: 0 }] }]
      },
      {
        type: 'grid-col', align: 'center', label: '设备编号', span: 8,
        children: [{ type: 'input', field: 'equipmentNo', props: { placeholder: '请输入设备编号' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '设备名称', span: 8,
        children: [{ type: 'input', field: 'equipmentName', props: { placeholder: '请输入设备名称' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '设备类别', span: 8,
        children: [{ type: 'input', field: 'category', props: { placeholder: '请输入设备类别' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '船舶名称', span: 8,
        children: [{ type: 'input', field: 'shipName', props: { placeholder: '请输入船舶名称' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '部门', span: 8,
        children: [{ type: 'input', field: 'deptName', props: { placeholder: '请输入部门' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '主管岗位', span: 8,
        children: [{ type: 'input', field: 'managerPost', props: { placeholder: '请输入主管岗位' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '生产商', span: 8,
        children: [{ type: 'input', field: 'manufacturer', props: { placeholder: '请输入生产商' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '是否进口', span: 8,
        children: [{ type: 'radio', field: 'isImported', options: [{ label: '是', value: 1 }, { label: '否', value: 0 }] }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '安装日期', span: 8,
        children: [{ type: 'date', field: 'installDate', props: { placeholder: '选择安装日期' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '安装位置', span: 8,
        children: [{ type: 'input', field: 'installPosition', props: { placeholder: '请输入安装位置' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '停用日期', span: 8,
        children: [{ type: 'date', field: 'stopDate', props: { placeholder: '选择停用日期' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '设备型号', span: 8,
        children: [{ type: 'input', field: 'model', props: { placeholder: '请输入设备型号' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '设备用途', span: 8,
        children: [{ type: 'input', field: 'purpose', props: { placeholder: '请输入设备用途' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '设备状态', span: 8,
        children: [
          {
            type: 'select', field: 'status',
            options: [
              { label: '正常', value: '1' },
              { label: '维修', value: '2' },
              { label: '停用', value: '0' }
            ],
            props: { placeholder: '请选择设备状态' }
          }
        ]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '价格（万元）', span: 8,
        children: [{ type: 'number', field: 'price', props: { placeholder: '请输入价格', min: 0, precision: 2 } }]
      },
      {
        type: 'grid-col', align: 'center', label: '核心参数', span: 16,
        children: [{ type: 'input', field: 'coreParams', props: { placeholder: '请输入核心参数' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '备注', span: 24,
        children: [{ type: 'textarea', field: 'remark', props: { placeholder: '请输入备注', rows: 3 } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '附件信息', span: 24,
        children: [{ type: 'file-list', props: { fileList: [], showUpload: true, showDownload: true, showDelete: true } }]
      }
    ]
  }
]

// ============================================================
// 2. 证件管理表单
// ============================================================
const certificateSchema: FormSchemaItem[] = [
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '所属单位', span: 8,
        children: [{ type: 'input', field: 'releaseOrgName', props: { placeholder: '默认所在单位', readonly: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '所属部门', span: 8,
        children: [{ type: 'input', field: 'releaseDeptName', props: { placeholder: '默认所属部门', readonly: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '姓名', span: 8,
        children: [{ type: 'input', field: 'userName', props: { placeholder: '姓名', readonly: true } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '证件类型', span: 8,
        children: [
          {
            type: 'select', field: 'licenseType',
            options: [
              { label: '外交护照', value: 0 },
              { label: '公务护照', value: 1 },
              { label: '公务普通护照', value: 2 },
              { label: '因公往来港澳通行证', value: 3 }
            ],
            props: { placeholder: '请选择证件类型' }
          }
        ]
      },
      {
        type: 'grid-col', align: 'center', label: '证件号码', span: 8,
        children: [{ type: 'input', field: 'licenseNo', props: { placeholder: '请输入证件编号' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '签发日期', span: 8,
        children: [{ type: 'date', field: 'issueDate', props: { placeholder: '年/月/日' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '有效期至', span: 8,
        children: [{ type: 'date', field: 'validUntil', props: { placeholder: '年/月/日' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '保管单位', span: 8,
        children: [{ type: 'input', field: 'safekeepOrgan', props: { placeholder: '保管单位' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '是否已提交', span: 8,
        children: [{ type: 'radio', field: 'isSubmit', options: [{ label: '是', value: '1' }, { label: '否', value: '0' }] }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '使用状态', span: 8,
        children: [
          {
            type: 'select', field: 'useStatus',
            options: [
              { label: '在库', value: 3 },
              { label: '已领用', value: 2 },
              { label: '逾期未归还', value: 1 },
              { label: '无（注销、过期）', value: 0 }
            ],
            props: { placeholder: '请选择', disabled: true }
          }
        ]
      },
      {
        type: 'grid-col', align: 'center', label: '备注', span: 16,
        children: [{ type: 'input', field: 'rmark', props: { placeholder: '请输入备注' } }]
      }
    ]
  }
]

// ============================================================
// 3. 领导出差申请表
// ============================================================
const travelLeaderSchema: FormSchemaItem[] = [
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '申请人', span: 8,
        children: [{ type: 'input', field: 'applicant', props: { placeholder: '申请人', readonly: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '申请部门', span: 8,
        children: [{ type: 'input', field: 'applyDept', props: { placeholder: '申请部门', readonly: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '申请时间', span: 8,
        children: [{ type: 'input', field: 'applyTime', props: { placeholder: '申请时间', readonly: true } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '带队领导', span: 8,
        children: [{ type: 'person-select', props: { modelValue: [], multiple: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '组织人员', span: 8,
        children: [{ type: 'person-select', props: { modelValue: [], multiple: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '其他人员', span: 8,
        children: [{ type: 'person-select', props: { modelValue: [], multiple: true } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '出差目的地', span: 12,
        children: [{ type: 'input', field: 'destination', props: { placeholder: '请输入出差目的地' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '出差天数', span: 12,
        children: [{ type: 'number', field: 'days', props: { placeholder: '天数', min: 1 } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '出发日期', span: 12,
        children: [{ type: 'date', field: 'startDate', props: { placeholder: '选择出发日期' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '返回日期', span: 12,
        children: [{ type: 'date', field: 'endDate', props: { placeholder: '选择返回日期' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '出差事由', span: 24,
        children: [{ type: 'textarea', field: 'reason', props: { placeholder: '请输入出差事由', rows: 4 } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '预算费用（元）', span: 12,
        children: [{ type: 'number', field: 'budget', props: { placeholder: '请输入预算金额', min: 0, precision: 2 } }]
      },
      {
        type: 'grid-col', align: 'center', label: '是否顺访', span: 12,
        children: [{ type: 'radio', field: 'isVisiting', options: [{ label: '是', value: 1 }, { label: '否', value: 0 }] }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '特殊情况说明', span: 24,
        children: [{ type: 'textarea', field: 'special', props: { placeholder: '请输入特殊情况说明', rows: 2 } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '附件信息', span: 24,
        children: [{ type: 'file-list', props: { fileList: [], showUpload: true, showDownload: true, showDelete: true } }]
      }
    ]
  }
]

// ============================================================
// 4. 会议室预约
// ============================================================
const meetingRoomSchema: FormSchemaItem[] = [
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '预约人', span: 8,
        children: [{ type: 'input', field: 'applicant', props: { placeholder: '预约人', readonly: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '所属部门', span: 8,
        children: [{ type: 'input', field: 'deptName', props: { placeholder: '所属部门', readonly: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '联系电话', span: 8,
        children: [{ type: 'input', field: 'phone', props: { placeholder: '请输入联系电话' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '会议室名称', span: 8,
        children: [
          {
            type: 'select', field: 'roomName',
            options: [
              { label: '第一会议室', value: 'room1' },
              { label: '第二会议室', value: 'room2' },
              { label: '第三会议室', value: 'room3' },
              { label: '贵宾接待室', value: 'vip' },
              { label: '多功能厅', value: 'hall' }
            ],
            props: { placeholder: '请选择会议室' }
          }
        ]
      },
      {
        type: 'grid-col', align: 'center', label: '会议日期', span: 8,
        children: [{ type: 'date', field: 'meetingDate', props: { placeholder: '选择会议日期' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '参会人数', span: 8,
        children: [{ type: 'number', field: 'attendeeCount', props: { placeholder: '请输入人数', min: 1 } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '开始时间', span: 12,
        children: [{ type: 'input', field: 'startTime', props: { placeholder: '如 09:00' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '结束时间', span: 12,
        children: [{ type: 'input', field: 'endTime', props: { placeholder: '如 11:00' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '会议主题', span: 24,
        children: [{ type: 'input', field: 'topic', props: { placeholder: '请输入会议主题' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '设备需求', span: 24,
        children: [
          {
            type: 'checkbox', field: 'equipment',
            options: [
              { label: '投影仪', value: 'projector' },
              { label: '视频会议系统', value: 'video' },
              { label: '白板', value: 'whiteboard' },
              { label: '录音设备', value: 'recorder' }
            ]
          }
        ]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '备注', span: 24,
        children: [{ type: 'textarea', field: 'remark', props: { placeholder: '其他需求或说明', rows: 3 } }]
      }
    ]
  }
]

// ============================================================
// 5. 资产领用申请
// ============================================================
const assetApplySchema: FormSchemaItem[] = [
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '申请人', span: 8,
        children: [{ type: 'input', field: 'applicant', props: { placeholder: '申请人', readonly: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '所属部门', span: 8,
        children: [{ type: 'input', field: 'deptName', props: { placeholder: '所属部门', readonly: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '申请日期', span: 8,
        children: [{ type: 'date', field: 'applyDate', props: { placeholder: '选择日期' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '资产类型', span: 8,
        children: [
          {
            type: 'select', field: 'assetType',
            options: [
              { label: '办公设备', value: 'office' },
              { label: '电子设备', value: 'electronic' },
              { label: '家具', value: 'furniture' },
              { label: '劳保用品', value: 'safety' },
              { label: '其他', value: 'other' }
            ],
            props: { placeholder: '请选择资产类型' }
          }
        ]
      },
      {
        type: 'grid-col', align: 'center', label: '资产名称', span: 8,
        children: [{ type: 'input', field: 'assetName', props: { placeholder: '请输入资产名称' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '数量', span: 8,
        children: [{ type: 'number', field: 'quantity', props: { placeholder: '请输入数量', min: 1 } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '规格型号', span: 12,
        children: [{ type: 'input', field: 'specification', props: { placeholder: '请输入规格型号' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '预计归还日期', span: 12,
        children: [{ type: 'date', field: 'returnDate', props: { placeholder: '选择预计归还日期' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '领用用途', span: 24,
        children: [{ type: 'textarea', field: 'purpose', props: { placeholder: '请说明领用用途', rows: 3 } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '备注', span: 24,
        children: [{ type: 'textarea', field: 'remark', props: { placeholder: '其他说明', rows: 2 } }]
      }
    ]
  }
]

// ============================================================
// 6. 加班申请
// ============================================================
const overtimeApplySchema: FormSchemaItem[] = [
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '申请人', span: 8,
        children: [{ type: 'input', field: 'applicant', props: { placeholder: '申请人', readonly: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '所属部门', span: 8,
        children: [{ type: 'input', field: 'deptName', props: { placeholder: '所属部门', readonly: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '申请日期', span: 8,
        children: [{ type: 'date', field: 'applyDate', props: { placeholder: '选择日期' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '加班日期', span: 12,
        children: [{ type: 'date', field: 'overtimeDate', props: { placeholder: '选择加班日期' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '加班类型', span: 12,
        children: [
          {
            type: 'select', field: 'overtimeType',
            options: [
              { label: '工作日加班', value: 'weekday' },
              { label: '休息日加班', value: 'weekend' },
              { label: '节假日加班', value: 'holiday' }
            ],
            props: { placeholder: '请选择加班类型' }
          }
        ]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '开始时间', span: 12,
        children: [{ type: 'input', field: 'startTime', props: { placeholder: '如 18:00' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '结束时间', span: 12,
        children: [{ type: 'input', field: 'endTime', props: { placeholder: '如 21:00' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '加班时长（小时）', span: 12,
        children: [{ type: 'number', field: 'hours', props: { placeholder: '请输入时长', min: 0.5, step: 0.5 } }]
      },
      {
        type: 'grid-col', align: 'center', label: '审批人', span: 12,
        children: [{ type: 'person-select', props: { modelValue: [], multiple: false } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '加班事由', span: 24,
        children: [{ type: 'textarea', field: 'reason', props: { placeholder: '请说明加班事由', rows: 4 } }]
      }
    ]
  }
]

// ============================================================
// 7. 采购申请
// ============================================================
const purchaseApplySchema: FormSchemaItem[] = [
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '申请人', span: 8,
        children: [{ type: 'input', field: 'applicant', props: { placeholder: '申请人', readonly: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '所属部门', span: 8,
        children: [{ type: 'input', field: 'deptName', props: { placeholder: '所属部门', readonly: true } }]
      },
      {
        type: 'grid-col', align: 'center', label: '申请日期', span: 8,
        children: [{ type: 'date', field: 'applyDate', props: { placeholder: '选择日期' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '采购类别', span: 8,
        children: [
          {
            type: 'select', field: 'purchaseCategory',
            options: [
              { label: '办公用品', value: 'office' },
              { label: 'IT设备', value: 'it' },
              { label: '劳保用品', value: 'safety' },
              { label: '维修材料', value: 'repair' },
              { label: '其他', value: 'other' }
            ],
            props: { placeholder: '请选择采购类别' }
          }
        ]
      },
      {
        type: 'grid-col', align: 'center', label: '物品名称', span: 8,
        children: [{ type: 'input', field: 'itemName', props: { placeholder: '请输入物品名称' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '规格型号', span: 8,
        children: [{ type: 'input', field: 'specification', props: { placeholder: '请输入规格型号' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '采购数量', span: 8,
        children: [{ type: 'number', field: 'quantity', props: { placeholder: '请输入数量', min: 1 } }]
      },
      {
        type: 'grid-col', align: 'center', label: '单价（元）', span: 8,
        children: [{ type: 'number', field: 'unitPrice', props: { placeholder: '请输入单价', min: 0, precision: 2 } }]
      },
      {
        type: 'grid-col', align: 'center', label: '预算总额（元）', span: 8,
        children: [{ type: 'number', field: 'totalBudget', props: { placeholder: '自动计算或手动输入', min: 0, precision: 2 } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '供应商', span: 12,
        children: [{ type: 'input', field: 'supplier', props: { placeholder: '请输入供应商名称' } }]
      },
      {
        type: 'grid-col', align: 'center', label: '期望到货日期', span: 12,
        children: [{ type: 'date', field: 'expectedDate', props: { placeholder: '选择期望到货日期' } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '采购原因', span: 24,
        children: [{ type: 'textarea', field: 'reason', props: { placeholder: '请说明采购原因', rows: 3 } }]
      }
    ]
  },
  {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col', align: 'center', label: '备注', span: 24,
        children: [{ type: 'textarea', field: 'remark', props: { placeholder: '其他说明', rows: 2 } }]
      }
    ]
  }
]

// ============================================================
// 注册表
// ============================================================
export const msaFormRegistry: Record<string, MsaFormSchemaConfig> = {
  'ship-equipment': {
    title: '船舶设备登记表',
    buttons: {
      add: [
        { text: '保存草稿', buttonType: 'primary', actions: [{ type: 'submit' }] },
        { text: '返回', actions: [{ type: 'navigate', navigatePath: '-1' }] }
      ],
      edit: [
        { text: '保存', buttonType: 'primary', actions: [{ type: 'submit' }] },
        { text: '返回', actions: [{ type: 'navigate', navigatePath: '-1' }] }
      ],
      detail: [
        { text: '编辑', buttonType: 'primary', actions: [{ type: 'navigate', navigatePath: './edit' }] },
        { text: '返回', actions: [{ type: 'navigate', navigatePath: '-1' }] }
      ]
    },
    schema: shipEquipmentSchema
  },

  'certificate': {
    title: '因公出国（境）证件管理',
    buttons: {
      add: [
        { text: '保存草稿', buttonType: 'primary', actions: [{ type: 'submit' }] },
        { text: '返回', actions: [{ type: 'navigate', navigatePath: '-1' }] }
      ],
      edit: [
        { text: '保存', buttonType: 'primary', actions: [{ type: 'submit' }] },
        { text: '返回', actions: [{ type: 'navigate', navigatePath: '-1' }] }
      ],
      detail: [
        { text: '编辑', buttonType: 'primary', actions: [{ type: 'navigate', navigatePath: './edit' }] },
        { text: '返回', actions: [{ type: 'navigate', navigatePath: '-1' }] }
      ]
    },
    schema: certificateSchema
  },

  'travel-leader': {
    title: '领导出差申请',
    buttons: defaultButtons('出差申请'),
    schema: travelLeaderSchema
  },

  'meeting-room': {
    title: '会议室预约',
    buttons: defaultButtons('会议室预约'),
    schema: meetingRoomSchema
  },

  'asset-apply': {
    title: '资产领用申请',
    buttons: defaultButtons('资产领用'),
    schema: assetApplySchema
  },

  'overtime-apply': {
    title: '加班申请',
    buttons: defaultButtons('加班'),
    schema: overtimeApplySchema
  },

  'purchase-apply': {
    title: '采购申请',
    buttons: defaultButtons('采购'),
    schema: purchaseApplySchema
  }
}
