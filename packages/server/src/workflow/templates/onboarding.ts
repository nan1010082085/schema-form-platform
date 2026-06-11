/**
 * 入职流程模板
 *
 * 新员工入职流程：HR 发起入职 → IT 配置账号 + 行政准备工位（并行）→ 部门经理确认。
 */
import { v4 as uuidv4 } from 'uuid'
import { BpmnElementType } from '@schema-form/flow-shared'

// ---- 流程图构建辅助函数 ----

interface FlowNodeData {
  id: string
  shape: string
  x: number
  y: number
  width: number
  height: number
  data: Record<string, unknown>
}

interface FlowEdgeData {
  id: string
  shape: string
  source: { cell: string }
  target: { cell: string }
  data: Record<string, unknown>
}

function makeStartNode(id: string, x: number, y: number): FlowNodeData {
  return {
    id,
    shape: 'bpmn-start-event',
    x,
    y,
    width: 40,
    height: 40,
    data: { bpmnType: BpmnElementType.StartEvent, label: '开始' },
  }
}

function makeEndNode(id: string, x: number, y: number): FlowNodeData {
  return {
    id,
    shape: 'bpmn-end-event',
    x,
    y,
    width: 40,
    height: 40,
    data: { bpmnType: BpmnElementType.EndEvent, label: '结束' },
  }
}

function makeUserTaskNode(
  id: string,
  label: string,
  x: number,
  y: number,
  assigneeType: 'user' | 'role' | 'expression' = 'user',
  assignee = '',
): FlowNodeData {
  return {
    id,
    shape: 'bpmn-user-task',
    x,
    y,
    width: 180,
    height: 60,
    data: {
      bpmnType: BpmnElementType.UserTask,
      label,
      assigneeType,
      assignee,
      approvalMode: 'single',
      rejectPolicy: 'reject-on-any',
    },
  }
}

function makeEdge(id: string, source: string, target: string, label?: string): FlowEdgeData {
  return {
    id,
    shape: 'bpmn-sequence-flow',
    source: { cell: source },
    target: { cell: target },
    data: { label: label ?? '' },
  }
}

// ---- 表单 Schema ----

function buildFormSchema(): Record<string, unknown>[] {
  return [
    {
      id: uuidv4(),
      type: 'form',
      props: { title: '入职申请' },
      children: [
        {
          id: uuidv4(),
          type: 'input',
          props: {
            label: '员工姓名',
            field: 'employeeName',
            required: true,
          },
        },
        {
          id: uuidv4(),
          type: 'input',
          props: {
            label: '所属部门',
            field: 'department',
            required: true,
          },
        },
        {
          id: uuidv4(),
          type: 'input',
          props: {
            label: '岗位',
            field: 'position',
            required: true,
          },
        },
        {
          id: uuidv4(),
          type: 'date',
          props: {
            label: '入职日期',
            field: 'startDate',
            required: true,
          },
        },
        {
          id: uuidv4(),
          type: 'input',
          props: {
            label: '联系邮箱',
            field: 'email',
            placeholder: '用于开通企业邮箱',
          },
        },
        {
          id: uuidv4(),
          type: 'input',
          props: {
            label: '联系电话',
            field: 'phone',
          },
        },
        {
          id: uuidv4(),
          type: 'select',
          props: {
            label: '用工形式',
            field: 'employmentType',
            required: true,
            options: [
              { label: '全职', value: 'fulltime' },
              { label: '兼职', value: 'parttime' },
              { label: '实习', value: 'intern' },
              { label: '外包', value: 'outsourced' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'textarea',
          props: {
            label: '备注',
            field: 'remark',
            rows: 2,
            placeholder: '如需特殊设备或权限请在此说明',
          },
        },
      ],
    },
  ]
}

// ---- 流程定义 ----

function buildFlowDefinition() {
  return {
    nodes: [
      makeStartNode('start', 100, 200),
      makeUserTaskNode('hr-init', 'HR 发起入职', 240, 185, 'role', 'hr'),
      makeUserTaskNode('it-setup', 'IT 配置账号', 470, 85, 'role', 'it'),
      makeUserTaskNode('admin-setup', '行政准备工位', 470, 285, 'role', 'admin'),
      makeUserTaskNode('manager-confirm', '部门经理确认', 700, 185, 'role', 'department_manager'),
      makeEndNode('end', 940, 200),
    ],
    edges: [
      makeEdge('e1', 'start', 'hr-init', '发起入职'),
      makeEdge('e2', 'hr-init', 'it-setup', '通知 IT'),
      makeEdge('e3', 'hr-init', 'admin-setup', '通知行政'),
      makeEdge('e4', 'it-setup', 'manager-confirm', '账号配置完成'),
      makeEdge('e5', 'admin-setup', 'manager-confirm', '工位准备完成'),
      makeEdge('e6', 'manager-confirm', 'end', '确认入职'),
    ],
  }
}

// ---- 导出模板定义 ----

export const onboardingTemplate = {
  name: '入职审批',
  description: '新员工入职流程：HR 发起入职 → IT 配置账号 + 行政准备工位（并行）→ 部门经理确认。',
  category: '人事' as const,
  tags: ['入职', '人事', '并行'],
  formSchema: buildFormSchema(),
  flowDefinition: buildFlowDefinition() as unknown as { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> },
  dataUpdateRules: [
    {
      trigger: 'task_completed',
      targetField: 'itStatus',
      sourceField: 'it_setup_status',
    },
    {
      trigger: 'task_completed',
      targetField: 'adminStatus',
      sourceField: 'admin_setup_status',
    },
  ],
}
