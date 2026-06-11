/**
 * 采购申请模板
 *
 * 采购申请审批流程：部门申请 → 经理审批 → 金额分级审批 → 财务确认。
 * 10000 元以上需 VP 审批。
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
      props: { title: '采购申请' },
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
          type: 'input',
          props: {
            label: '采购物品',
            field: 'itemName',
            required: true,
            placeholder: '请输入物品名称',
          },
        },
        {
          id: uuidv4(),
          type: 'select',
          props: {
            label: '物品类别',
            field: 'itemCategory',
            required: true,
            options: [
              { label: '办公用品', value: 'office' },
              { label: '电子设备', value: 'electronics' },
              { label: '家具', value: 'furniture' },
              { label: '耗材', value: 'consumables' },
              { label: '其他', value: 'other' },
            ],
          },
        },
        {
          id: uuidv4(),
          type: 'number',
          props: {
            label: '数量',
            field: 'quantity',
            required: true,
            min: 1,
          },
        },
        {
          id: uuidv4(),
          type: 'number',
          props: {
            label: '单价(元)',
            field: 'unitPrice',
            required: true,
            min: 0,
            precision: 2,
          },
        },
        {
          id: uuidv4(),
          type: 'number',
          props: {
            label: '总金额(元)',
            field: 'totalAmount',
            required: true,
            min: 0,
            precision: 2,
          },
        },
        {
          id: uuidv4(),
          type: 'input',
          props: {
            label: '供应商',
            field: 'supplier',
            placeholder: '请输入供应商名称',
          },
        },
        {
          id: uuidv4(),
          type: 'textarea',
          props: {
            label: '采购原因',
            field: 'reason',
            required: true,
            rows: 3,
          },
        },
        {
          id: uuidv4(),
          type: 'upload',
          props: {
            label: '报价单',
            field: 'quotationFiles',
            accept: '.jpg,.png,.pdf,.xlsx',
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
      makeUserTaskNode('dept-apply', '部门申请', 240, 185, 'user', ''),
      makeUserTaskNode('dept-approve', '部门经理审批', 470, 185, 'role', 'department_manager'),
      makeGatewayNode('gw-amount', '金额判断', 700, 190),
      makeUserTaskNode('vp-approve', 'VP 审批', 880, 85, 'role', 'vp'),
      makeUserTaskNode('finance-confirm', '财务确认', 880, 285, 'role', 'finance'),
      makeEndNode('end', 1120, 190),
    ],
    edges: [
      makeEdge('e1', 'start', 'dept-apply', '发起申请'),
      makeEdge('e2', 'dept-apply', 'dept-approve', '提交审批'),
      makeEdge('e3', 'dept-approve', 'gw-amount', '审批通过'),
      makeEdge('e4', 'gw-amount', 'vp-approve', '金额 > 10000'),
      makeEdge('e5', 'gw-amount', 'finance-confirm', '金额 <= 10000'),
      makeEdge('e6', 'vp-approve', 'finance-confirm', 'VP 审批通过'),
      makeEdge('e7', 'finance-confirm', 'end', '确认完成'),
    ],
  }
}

// ---- 导出模板定义 ----

export const purchaseRequestTemplate = {
  name: '采购审批',
  description: '采购申请审批流程：部门申请 → 经理审批 → 金额分级审批 → 财务确认。10000 元以上需 VP 审批。',
  category: '采购' as const,
  tags: ['采购', '审批', '财务'],
  formSchema: buildFormSchema(),
  flowDefinition: buildFlowDefinition() as unknown as { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> },
  dataUpdateRules: [],
}
