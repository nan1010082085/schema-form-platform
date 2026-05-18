import type { FormSchemaItem } from '@/components/FormGrid'

export const demoSchemas: Record<string, { title: string; schema: FormSchemaItem[] }> = {
  'demo-approval': {
    title: '审批申请',
    schema: [
      { type: 'page', children: [
        { type: 'card', children: [
          { type: 'title', props: { label: '审批申请' } },
          { type: 'grid-row', children: [
            { type: 'grid-col', label: '申请人', span: 8, align: 'center',
              children: [{ type: 'input', field: 'applicant', props: { placeholder: '请输入申请人' } }] },
            { type: 'grid-col', label: '申请部门', span: 8, align: 'center',
              children: [{ type: 'input', field: 'department', props: { placeholder: '请输入部门' } }] },
            { type: 'grid-col', label: '申请日期', span: 8, align: 'center',
              children: [{ type: 'date', field: 'applyDate', props: { placeholder: '选择日期' } }] }
          ]},
          { type: 'grid-row', children: [
            { type: 'grid-col', label: '申请事由', span: 24,
              children: [{ type: 'textarea', field: 'reason', props: { placeholder: '请输入申请事由', rows: 4 } }] }
          ]},
          { type: 'grid-row', children: [
            { type: 'grid-col', label: '起止日期', span: 12, align: 'center',
              children: [{ type: 'date-range', field: '__dateRange', props: { fieldStart: 'startDate', fieldEnd: 'endDate' } }] },
            { type: 'grid-col', label: '优先级', span: 12, align: 'center',
              children: [{
                type: 'select', field: 'priority',
                options: [
                  { label: '普通', value: 'normal' },
                  { label: '紧急', value: 'urgent' },
                  { label: '特急', value: 'critical' }
                ],
                props: { placeholder: '请选择优先级' }
              }] }
          ]}
        ]}
      ]}
    ]
  },

  'demo-leave': {
    title: '请假申请',
    schema: [
      { type: 'page', children: [
        { type: 'card', children: [
          { type: 'title', props: { label: '请假申请' } },
          { type: 'grid-row', children: [
            { type: 'grid-col', label: '姓名', span: 8, align: 'center',
              children: [{ type: 'input', field: 'name', props: { placeholder: '请输入姓名' } }] },
            { type: 'grid-col', label: '请假类型', span: 8, align: 'center',
              children: [{
                type: 'select', field: 'leaveType',
                options: [
                  { label: '事假', value: 'personal' },
                  { label: '病假', value: 'sick' },
                  { label: '年假', value: 'annual' },
                  { label: '调休', value: 'compensatory' }
                ],
                props: { placeholder: '请选择' }
              }] },
            { type: 'grid-col', label: '请假天数', span: 8, align: 'center',
              children: [{ type: 'number', field: 'days', props: { min: 0.5, step: 0.5, placeholder: '天数' } }] }
          ]},
          { type: 'grid-row', children: [
            { type: 'grid-col', label: '起止时间', span: 12, align: 'center',
              children: [{ type: 'date-range', field: '__leaveRange', props: { fieldStart: 'leaveStart', fieldEnd: 'leaveEnd' } }] },
            { type: 'grid-col', label: '联系电话', span: 12, align: 'center',
              children: [{ type: 'input', field: 'phone', props: { placeholder: '请输入联系电话' } }] }
          ]},
          { type: 'grid-row', children: [
            { type: 'grid-col', label: '请假事由', span: 24,
              children: [{ type: 'textarea', field: 'leaveReason', props: { placeholder: '请输入请假事由', rows: 4 } }] }
          ]}
        ]}
      ]}
    ]
  },

  'demo-meeting': {
    title: '会议申请',
    schema: [
      { type: 'page', children: [
        { type: 'card', children: [
          { type: 'title', props: { label: '会议申请' } },
          { type: 'grid-row', children: [
            { type: 'grid-col', label: '会议名称', span: 16, align: 'center',
              children: [{ type: 'input', field: 'meetingName', props: { placeholder: '请输入会议名称' } }] },
            { type: 'grid-col', label: '会议类型', span: 8, align: 'center',
              children: [{
                type: 'radio', field: 'meetingType',
                options: [
                  { label: '现场', value: 'onsite' },
                  { label: '视频', value: 'video' }
                ]
              }] }
          ]},
          { type: 'grid-row', children: [
            { type: 'grid-col', label: '会议时间', span: 12, align: 'center',
              children: [{ type: 'date-range', field: '__meetingRange', props: { fieldStart: 'meetingStart', fieldEnd: 'meetingEnd' } }] },
            { type: 'grid-col', label: '会议室', span: 12, align: 'center',
              children: [{
                type: 'select', field: 'room',
                options: [
                  { label: '第一会议室', value: 'room1' },
                  { label: '第二会议室', value: 'room2' },
                  { label: '第三会议室', value: 'room3' }
                ],
                props: { placeholder: '请选择会议室' }
              }] }
          ]},
          { type: 'grid-row', children: [
            { type: 'grid-col', label: '参会人员', span: 24,
              children: [{ type: 'textarea', field: 'attendees', props: { placeholder: '请输入参会人员', rows: 2 } }] }
          ]},
          { type: 'grid-row', children: [
            { type: 'grid-col', label: '会议议程', span: 24,
              children: [{ type: 'richtext', field: 'agenda', props: { placeholder: '请输入会议议程', rows: 6 } }] }
          ]}
        ]}
      ]}
    ]
  },

  'demo-search-list': {
    title: 'Search List — 业务列表',
    schema: [
      {
        type: 'search-list',
        label: 'User Management',
        props: {
          pageSize: 10,
          rowKey: 'id',
          showSelection: true,
          showIndex: true,
          border: true,
          stripe: true,
          emptyText: 'No users found',
        },
        listApi: {
          url: '/api/users',
          method: 'post',
        },
        searchFields: [
          { type: 'input', field: 'keyword', label: 'Search', span: 6, placeholder: 'Name or phone' },
          {
            type: 'select', field: 'status', label: 'Status', span: 6,
            options: [
              { label: 'Active', value: 1 },
              { label: 'Disabled', value: 0 },
            ],
          },
          { type: 'date-range', field: 'dateRange', label: 'Created', span: 8 },
        ],
        columns: [
          { prop: 'name', label: 'Name', width: 120 },
          { prop: 'phone', label: 'Phone', width: 140 },
          {
            prop: 'status', label: 'Status', width: 100,
            render: 'tag',
            colorMap: { '1': 'success', '0': 'danger' },
          },
          { prop: 'email', label: 'Email', minWidth: 200, render: 'tooltip' },
          { prop: 'createdAt', label: 'Created At', width: 180, sortable: true },
        ],
        rowActions: [
          { label: 'View', type: 'emit', emitEvent: 'view-row', buttonType: 'primary' },
          { label: 'Edit', type: 'emit', emitEvent: 'edit-row' },
          {
            label: 'Delete', type: 'api', buttonType: 'danger',
            apiUrl: '/api/users/:id', apiMethod: 'delete',
            confirm: 'Are you sure you want to delete this user?',
          },
        ],
        buttons: [
          {
            text: 'Add User', type: 'primary',
            actions: [{ type: 'emit', eventName: 'add-user' }],
          },
          {
            text: 'Export',
            actions: [{ type: 'emit', eventName: 'export' }],
          },
        ],
      } as FormSchemaItem,
    ],
  },
}
