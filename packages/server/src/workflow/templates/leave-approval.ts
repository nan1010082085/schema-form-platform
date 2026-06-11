/**
 * 请假审批模板
 *
 * 标准请假审批流程：员工提交请假申请 → 部门经理审批 → HR 备案。
 * 支持年假、事假、病假等多种类型。
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
      props: { title: '请假申请' },
      children: [
        {
          id: uuidv4(),
          type: 'input',
          props: {
            label: '申请人',
            field: 'applicantName',
            required: true,
            placeholder: '请输入姓名',
          },
        },
        {
          id: uuidv4(),
          type: 'select',
          props: {
            label: '请假类型',
            field: 'leaveType',
            required: true,
            options: [
              { label: '年假', value: 'annual' },
              { label: '事假', value: 'personal' },
              { label: '病假', value: 'sick' },
              { label: '婚假', value: 'marriage' },
              { label: '产假', value: 'maternity' },
              { label: '陪产假', value: 'paternity' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'date-range',
          props: {
            label: '请假时间',
            field: 'leaveDateRange',
            required: true,
          },
        },
        {
          id: uuidv4(),
          type: 'number',
          props: {
            label: '请假天数',
            field: 'leaveDays',
            required: true,
            min: 0.5,
            precision: 1,
          },
        },
        {
          id: uuidv4(),
          type: 'textarea',
          props: {
            label: '请假事由',
            field: 'reason',
            required: true,
            rows: 3,
            placeholder: '请详细说明请假原因',
          },
        },
        {
          id: uuidv4(),
          type: 'upload',
          props: {
            label: '证明材料',
            field: 'attachments',
            accept: '.jpg,.png,.pdf,.doc,.docx',
            tip: '病假需提供医院证明',
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
      makeUserTaskNode('dept-approve', '部门经理审批', 280, 185, 'role', 'department_manager'),
      makeUserTaskNode('hr-record', 'HR 备案', 560, 185, 'role', 'hr'),
      makeEndNode('end', 840, 200),
    ],
    edges: [
      makeEdge('e1', 'start', 'dept-approve', '提交申请'),
      makeEdge('e2', 'dept-approve', 'hr-record', '审批通过'),
      makeEdge('e3', 'hr-record', 'end', '备案完成'),
    ],
  }
}

// ---- 导出模板定义 ----

export const leaveApprovalTemplate = {
  name: '请假审批',
  description: '标准请假审批流程：员工提交请假申请 → 部门经理审批 → HR 备案。支持年假、事假、病假等多种类型。',
  category: '人事' as const,
  tags: ['请假', '人事', '日常'],
  formSchema: buildFormSchema(),
  flowDefinition: buildFlowDefinition() as unknown as { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> },
  dataUpdateRules: [
    {
      trigger: 'task_completed',
      targetField: 'status',
      sourceField: 'task_status',
      transform: 'approved',
    },
  ],
}
