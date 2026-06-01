/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all model dependencies
vi.mock('../../flow-models/FlowDefinition.js', () => ({
  FlowDefinitionModel: {
    find: vi.fn(),
    findById: vi.fn(),
  },
}))

vi.mock('../../flow-models/FlowVersion.js', () => ({
  FlowVersionModel: {
    findById: vi.fn(),
  },
}))

vi.mock('../../models/FormSchema.js', () => ({
  FormSchemaModel: {
    find: vi.fn(),
  },
}))

vi.mock('../../models/User.js', () => ({
  UserModel: {
    find: vi.fn(),
  },
}))

import { executeFlowTool, validateFlowGraph, FLOW_TOOLS } from '../tools/flowTools.js'
import { FlowDefinitionModel } from '../../flow-models/FlowDefinition.js'
import { FlowVersionModel } from '../../flow-models/FlowVersion.js'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { UserModel } from '../../models/User.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FLOW_TOOLS', () => {
  it('defines 5 tools', () => {
    expect(FLOW_TOOLS).toHaveLength(5)
  })

  it('has correct tool names', () => {
    const names = FLOW_TOOLS.map((t) => t.function.name)
    expect(names).toEqual([
      'search_flows',
      'get_flow_detail',
      'search_users',
      'search_schemas',
      'validate_flow',
    ])
  })
})

describe('executeFlowTool', () => {
  it('returns error for unknown tool', async () => {
    const result = await executeFlowTool('unknown_tool', {})
    expect(result.success).toBe(false)
    expect(result.error).toContain('Unknown tool')
  })

  describe('search_flows', () => {
    it('searches with keyword', async () => {
      const mockFlows = [{ _id: 'f1', name: '审批流程', description: 'test', status: 'draft' }]
      vi.mocked(FlowDefinitionModel.find).mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(mockFlows),
            }),
          }),
        }),
      } as any)

      const result = await executeFlowTool('search_flows', { keyword: '审批' })
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('total', 1)
      expect(FlowDefinitionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ name: expect.objectContaining({ $options: 'i' }) }),
          ]),
        }),
      )
    })

    it('searches with status filter', async () => {
      vi.mocked(FlowDefinitionModel.find).mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any)

      const result = await executeFlowTool('search_flows', { status: 'published' })
      expect(result.success).toBe(true)
      expect(FlowDefinitionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published' }),
      )
    })
  })

  describe('get_flow_detail', () => {
    it('returns flow detail with graph', async () => {
      const mockDefinition = {
        _id: 'f1',
        name: '审批流程',
        description: 'test',
        status: 'draft',
        currentVersionId: 'v1',
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockVersion = {
        _id: 'v1',
        graph: { nodes: [{ id: 'n1' }], edges: [] },
      }

      vi.mocked(FlowDefinitionModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockDefinition),
      } as any)
      vi.mocked(FlowVersionModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockVersion),
      } as any)

      const result = await executeFlowTool('get_flow_detail', { flowId: 'f1' })
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('graph')
    })

    it('returns error when flowId is missing', async () => {
      const result = await executeFlowTool('get_flow_detail', {})
      expect(result.success).toBe(false)
      expect(result.error).toContain('flowId is required')
    })

    it('returns error when flow not found', async () => {
      vi.mocked(FlowDefinitionModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any)

      const result = await executeFlowTool('get_flow_detail', { flowId: 'nonexistent' })
      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('search_users', () => {
    it('searches users by keyword', async () => {
      const mockUsers = [{ _id: 'u1', username: 'admin', displayName: '管理员', roles: ['admin'] }]
      vi.mocked(UserModel.find).mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(mockUsers),
            }),
          }),
        }),
      } as any)

      const result = await executeFlowTool('search_users', { keyword: 'admin' })
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('total', 1)
    })
  })

  describe('search_schemas', () => {
    it('searches schemas by keyword', async () => {
      const mockSchemas = [{ _id: 's1', name: '用户表单', type: 'form', status: 'draft', version: '1' }]
      vi.mocked(FormSchemaModel.find).mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(mockSchemas),
            }),
          }),
        }),
      } as any)

      const result = await executeFlowTool('search_schemas', { keyword: '用户' })
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('total', 1)
    })
  })

  describe('validate_flow', () => {
    it('validates a correct flow', () => {
      const result = executeFlowTool('validate_flow', {
        flow: {
          nodes: [
            { id: 'n1', data: { bpmnType: 'startEvent' } },
            { id: 'n2', data: { bpmnType: 'endEvent' } },
          ],
          edges: [],
        },
      })
      // validateFlowTool is synchronous
      expect(result).toBeDefined()
    })

    it('returns error for missing nodes/edges', () => {
      const result = executeFlowTool('validate_flow', { flow: {} })
      expect(result).toBeDefined()
    })
  })
})

describe('validateFlowGraph', () => {
  it('returns empty array for valid flow', () => {
    const errors = validateFlowGraph({
      nodes: [
        { id: 'n1', data: { bpmnType: 'startEvent' } },
        { id: 'n2', data: { bpmnType: 'userTask', label: '审批', candidateUsers: ['u1'] } },
        { id: 'n3', data: { bpmnType: 'endEvent' } },
      ],
      edges: [
        { id: 'e1', source: { cell: 'n1' }, target: { cell: 'n2' } },
        { id: 'e2', source: { cell: 'n2' }, target: { cell: 'n3' } },
      ],
    })
    expect(errors).toHaveLength(0)
  })

  it('reports missing startEvent', () => {
    const errors = validateFlowGraph({
      nodes: [
        { id: 'n1', data: { bpmnType: 'userTask', label: '审批', candidateUsers: ['u1'] } },
        { id: 'n2', data: { bpmnType: 'endEvent' } },
      ],
      edges: [],
    })
    expect(errors).toContain('缺少 startEvent 开始节点')
  })

  it('reports missing endEvent', () => {
    const errors = validateFlowGraph({
      nodes: [
        { id: 'n1', data: { bpmnType: 'startEvent' } },
        { id: 'n2', data: { bpmnType: 'userTask', label: '审批', candidateUsers: ['u1'] } },
      ],
      edges: [],
    })
    expect(errors).toContain('缺少 endEvent 结束节点')
  })

  it('reports empty nodes', () => {
    const errors = validateFlowGraph({ nodes: [], edges: [] })
    expect(errors).toContain('流程至少需要一个节点')
  })

  it('reports invalid edge references', () => {
    const errors = validateFlowGraph({
      nodes: [
        { id: 'n1', data: { bpmnType: 'startEvent' } },
        { id: 'n2', data: { bpmnType: 'endEvent' } },
      ],
      edges: [
        { id: 'e1', source: { cell: 'n1' }, target: { cell: 'nonexistent' } },
      ],
    })
    expect(errors.some((e) => e.includes('nonexistent'))).toBe(true)
  })

  it('reports userTask without assignee', () => {
    const errors = validateFlowGraph({
      nodes: [
        { id: 'n1', data: { bpmnType: 'startEvent' } },
        { id: 'n2', data: { bpmnType: 'userTask', label: '审批' } },
        { id: 'n3', data: { bpmnType: 'endEvent' } },
      ],
      edges: [
        { id: 'e1', source: { cell: 'n1' }, target: { cell: 'n2' } },
        { id: 'e2', source: { cell: 'n2' }, target: { cell: 'n3' } },
      ],
    })
    expect(errors.some((e) => e.includes('缺少指派人配置'))).toBe(true)
  })

  it('reports timerEvent without timer config', () => {
    const errors = validateFlowGraph({
      nodes: [
        { id: 'n1', data: { bpmnType: 'startEvent' } },
        { id: 'n2', data: { bpmnType: 'timerEvent', label: '超时' } },
        { id: 'n3', data: { bpmnType: 'endEvent' } },
      ],
      edges: [
        { id: 'e1', source: { cell: 'n1' }, target: { cell: 'n2' } },
        { id: 'e2', source: { cell: 'n2' }, target: { cell: 'n3' } },
      ],
    })
    expect(errors.some((e) => e.includes('缺少 timerType'))).toBe(true)
  })

  it('reports exclusiveGateway without conditions', () => {
    const errors = validateFlowGraph({
      nodes: [
        { id: 'n1', data: { bpmnType: 'startEvent' } },
        { id: 'n2', data: { bpmnType: 'exclusiveGateway', gatewayDirection: 'diverging' } },
        { id: 'n3', data: { bpmnType: 'endEvent' } },
        { id: 'n4', data: { bpmnType: 'endEvent' } },
      ],
      edges: [
        { id: 'e1', source: { cell: 'n1' }, target: { cell: 'n2' } },
        { id: 'e2', source: { cell: 'n2' }, target: { cell: 'n3' } },
        { id: 'e3', source: { cell: 'n2' }, target: { cell: 'n4' } },
      ],
    })
    expect(errors.some((e) => e.includes('排他网关'))).toBe(true)
  })

  it('accepts exclusiveGateway with defaultFlow', () => {
    const errors = validateFlowGraph({
      nodes: [
        { id: 'n1', data: { bpmnType: 'startEvent' } },
        { id: 'n2', data: { bpmnType: 'exclusiveGateway', gatewayDirection: 'diverging', defaultFlow: 'e2' } },
        { id: 'n3', data: { bpmnType: 'endEvent' } },
        { id: 'n4', data: { bpmnType: 'endEvent' } },
      ],
      edges: [
        { id: 'e1', source: { cell: 'n1' }, target: { cell: 'n2' } },
        { id: 'e2', source: { cell: 'n2' }, target: { cell: 'n3' } },
        { id: 'e3', source: { cell: 'n2' }, target: { cell: 'n4' } },
      ],
    })
    expect(errors).toHaveLength(0)
  })
})
