/**
 * 报销审批模板
 *
 * 费用报销审批流程：提交报销单 → 金额判断 → 经理/财务分级审批。
 * 5000 元以上需经理额外审批。
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

function makeGatewayNode(id: string, label: string, x: number, y: number): FlowNodeData {
  return {
    id,
    shape: 'bpmn-exclusive-gateway',
    x,
    y,
    width: 50,
    height: 50,
    data: {
      bpmnType: BpmnElementType.ExclusiveGateway,
      label,
      gatewayDirection: 'diverging',
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
      props: { title: '报销申请' },
      children: [
        {
          id: uuidv4(),
          type: 'input',
          props: {
            label: '申请人',
            field: 'applicantName',
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
          type: 'select',
          props: {
            label: '费用类型',
            field: 'expenseType',
            required: true,
            options: [
              { label: '交通', value: 'transport' },
              { label: '餐饮', value: 'meal' },
              { label: '住宿', value: 'hotel' },
              { label: '办公用品', value: 'office' },
              { label: '通讯', value: 'communication' },
              { label: '其他', value: 'other' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'number',
          props: {
            label: '报销金额',
            field: 'amount',
            required: true,
            min: 0,
            precision: 2,
          },
        },
        {
          id: uuidv4(),
          type: 'date',
          props: {
            label: '费用日期',
            field: 'expenseDate',
            required: true,
          },
        },
        {
          id: uuidv4(),
          type: 'input',
          props: {
            label: '费用事由',
            field: 'expenseReason',
            required: true,
            placeholder: '请简述费用用途',
          },
        },
        {
          id: uuidv4(),
          type: 'upload',
          props: {
            label: '发票附件',
            field: 'invoiceFiles',
            required: true,
            accept: '.jpg,.png,.pdf',
            tip: '请上传清晰的发票照片或扫描件',
          },
        },
        {
          id: uuidv4(),
          type: 'textarea',
          props: {
            label: '备注说明',
            field: 'remark',
            rows: 3,
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
      makeGatewayNode('gw-amount', '金额判断', 300, 190),
      makeUserTaskNode('manager-approve', '经理审批', 500, 85, 'role', 'manager'),
      makeUserTaskNode('finance-approve', '财务审批', 500, 285, 'role', 'finance'),
      makeEndNode('end', 750, 200),
    ],
    edges: [
      makeEdge('e1', 'start', 'gw-amount', '提交报销'),
      makeEdge('e2', 'gw-amount', 'manager-approve', '金额 > 5000'),
      makeEdge('e3', 'gw-amount', 'finance-approve', '金额 <= 5000'),
      makeEdge('e4', 'manager-approve', 'finance-approve', '经理审批通过'),
      makeEdge('e5', 'finance-approve', 'end', '财务审批通过'),
    ],
  }
}

// ---- 导出模板定义 ----

export const expenseReportTemplate = {
  name: '报销审批',
  description: '费用报销审批流程：提交报销单 → 金额判断 → 经理/财务分级审批。5000 元以上需经理额外审批。',
  category: '财务' as const,
  tags: ['报销', '财务', '审批'],
  formSchema: buildFormSchema(),
  flowDefinition: buildFlowDefinition() as unknown as { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> },
  dataUpdateRules: [],
}
