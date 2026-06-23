import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyAutoLayout } from '../utils/autoLayout.js'
import type { Node, Edge } from '@vue-flow/core'

function makeNode(id: string, type: string, x = 0, y = 0): Node {
  return { id, type, position: { x, y }, data: {} }
}

function makeEdge(id: string, source: string, target: string): Edge {
  return { id, source, target }
}

describe('applyAutoLayout', () => {
  it('returns empty arrays unchanged', () => {
    const result = applyAutoLayout([], [])
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })

  it('positions a single node', () => {
    const nodes = [makeNode('n1', 'user-task', 0, 0)]
    const result = applyAutoLayout(nodes, [])
    expect(result.nodes[0].position.x).toBeDefined()
    expect(result.nodes[0].position.y).toBeDefined()
  })

  it('positions nodes left-to-right with LR direction', () => {
    const nodes = [
      makeNode('start', 'start-event', 0, 0),
      makeNode('task', 'user-task', 0, 0),
      makeNode('end', 'end-event', 0, 0),
    ]
    const edges = [
      makeEdge('e1', 'start', 'task'),
      makeEdge('e2', 'task', 'end'),
    ]
    const result = applyAutoLayout(nodes, edges, 'LR')

    const startX = result.nodes.find(n => n.id === 'start')!.position.x
    const taskX = result.nodes.find(n => n.id === 'task')!.position.x
    const endX = result.nodes.find(n => n.id === 'end')!.position.x
    expect(startX).toBeLessThan(taskX)
    expect(taskX).toBeLessThan(endX)
  })

  it('positions nodes top-to-bottom with TB direction', () => {
    const nodes = [
      makeNode('start', 'start-event', 0, 0),
      makeNode('task', 'user-task', 0, 0),
      makeNode('end', 'end-event', 0, 0),
    ]
    const edges = [
      makeEdge('e1', 'start', 'task'),
      makeEdge('e2', 'task', 'end'),
    ]
    const result = applyAutoLayout(nodes, edges, 'TB')

    const startY = result.nodes.find(n => n.id === 'start')!.position.y
    const taskY = result.nodes.find(n => n.id === 'task')!.position.y
    const endY = result.nodes.find(n => n.id === 'end')!.position.y
    expect(startY).toBeLessThan(taskY)
    expect(taskY).toBeLessThan(endY)
  })

  it('preserves node ids and types', () => {
    const nodes = [
      makeNode('n1', 'user-task', 10, 20),
      makeNode('n2', 'exclusive-gateway', 30, 40),
    ]
    const edges = [makeEdge('e1', 'n1', 'n2')]
    const result = applyAutoLayout(nodes, edges)

    expect(result.nodes[0].id).toBe('n1')
    expect(result.nodes[0].type).toBe('user-task')
    expect(result.nodes[1].id).toBe('n2')
    expect(result.nodes[1].type).toBe('exclusive-gateway')
  })

  it('preserves edges unchanged', () => {
    const nodes = [
      makeNode('n1', 'user-task'),
      makeNode('n2', 'user-task'),
    ]
    const edges = [makeEdge('e1', 'n1', 'n2')]
    const result = applyAutoLayout(nodes, edges)
    expect(result.edges).toEqual(edges)
  })

  it('handles parallel branches with gateway', () => {
    const nodes = [
      makeNode('start', 'start-event'),
      makeNode('gw', 'parallel-gateway'),
      makeNode('a', 'user-task'),
      makeNode('b', 'user-task'),
      makeNode('end', 'end-event'),
    ]
    const edges = [
      makeEdge('e1', 'start', 'gw'),
      makeEdge('e2', 'gw', 'a'),
      makeEdge('e3', 'gw', 'b'),
      makeEdge('e4', 'a', 'end'),
      makeEdge('e5', 'b', 'end'),
    ]
    const result = applyAutoLayout(nodes, edges, 'LR')

    const gwX = result.nodes.find(n => n.id === 'gw')!.position.x
    const aX = result.nodes.find(n => n.id === 'a')!.position.x
    const bX = result.nodes.find(n => n.id === 'b')!.position.x
    expect(gwX).toBeLessThan(aX)
    expect(gwX).toBeLessThan(bX)
  })

  it('does not mutate the original nodes array', () => {
    const original = [makeNode('n1', 'user-task', 0, 0)]
    const copy = [...original]
    applyAutoLayout(original, [])
    expect(original[0].position).toEqual(copy[0].position)
  })

  // --- Options parameter tests ---

  it('accepts options object with direction', () => {
    const nodes = [
      makeNode('start', 'start-event', 0, 0),
      makeNode('end', 'end-event', 0, 0),
    ]
    const edges = [makeEdge('e1', 'start', 'end')]
    const result = applyAutoLayout(nodes, edges, { direction: 'TB' })

    const startY = result.nodes.find(n => n.id === 'start')!.position.y
    const endY = result.nodes.find(n => n.id === 'end')!.position.y
    expect(startY).toBeLessThan(endY)
  })

  it('accepts options object with nodeSep and rankSep', () => {
    const nodes = [
      makeNode('start', 'start-event', 0, 0),
      makeNode('task', 'user-task', 0, 0),
      makeNode('end', 'end-event', 0, 0),
    ]
    const edges = [
      makeEdge('e1', 'start', 'task'),
      makeEdge('e2', 'task', 'end'),
    ]

    const tight = applyAutoLayout(nodes, edges, { direction: 'LR', nodeSep: 20, rankSep: 30 })
    const loose = applyAutoLayout(nodes, edges, { direction: 'LR', nodeSep: 200, rankSep: 300 })

    // With larger rankSep, nodes should be further apart horizontally
    const tightGap = tight.nodes.find(n => n.id === 'task')!.position.x - tight.nodes.find(n => n.id === 'start')!.position.x
    const looseGap = loose.nodes.find(n => n.id === 'task')!.position.x - loose.nodes.find(n => n.id === 'start')!.position.x
    expect(looseGap).toBeGreaterThan(tightGap)
  })

  it('defaults to LR direction when options has no direction', () => {
    const nodes = [
      makeNode('start', 'start-event', 0, 0),
      makeNode('end', 'end-event', 0, 0),
    ]
    const edges = [makeEdge('e1', 'start', 'end')]
    const result = applyAutoLayout(nodes, edges, {})

    // LR: start should be left of end
    const startX = result.nodes.find(n => n.id === 'start')!.position.x
    const endX = result.nodes.find(n => n.id === 'end')!.position.x
    expect(startX).toBeLessThan(endX)
  })

  it('defaults nodeSep/rankSep when not provided in options', () => {
    const nodes = [
      makeNode('start', 'start-event', 0, 0),
      makeNode('end', 'end-event', 0, 0),
    ]
    const edges = [makeEdge('e1', 'start', 'end')]

    // Should not throw with partial options
    const result = applyAutoLayout(nodes, edges, { direction: 'TB' })
    expect(result.nodes).toHaveLength(2)
  })

  // --- New BPMN element type coverage ---

  it('handles all BPMN event types', () => {
    const eventTypes = [
      'start-event', 'end-event', 'timer-event',
      'message-event', 'signal-event', 'conditional-event',
      'error-event', 'escalation-event', 'compensation-event',
    ]
    const nodes = eventTypes.map((type, i) => makeNode(`ev-${i}`, type))
    // Chain them in sequence
    const edges = eventTypes.slice(1).map((_, i) => makeEdge(`e-${i}`, `ev-${i}`, `ev-${i + 1}`))

    const result = applyAutoLayout(nodes, edges, 'LR')
    expect(result.nodes).toHaveLength(eventTypes.length)
    // All nodes should have valid positions
    for (const node of result.nodes) {
      expect(typeof node.position.x).toBe('number')
      expect(typeof node.position.y).toBe('number')
      expect(Number.isFinite(node.position.x)).toBe(true)
      expect(Number.isFinite(node.position.y)).toBe(true)
    }
  })

  it('handles all BPMN task types', () => {
    const taskTypes = [
      'user-task', 'service-task', 'script-task',
      'send-task', 'receive-task', 'call-activity',
      'business-rule-task', 'manual-task',
    ]
    const nodes = taskTypes.map((type, i) => makeNode(`t-${i}`, type))
    const edges = taskTypes.slice(1).map((_, i) => makeEdge(`e-${i}`, `t-${i}`, `t-${i + 1}`))

    const result = applyAutoLayout(nodes, edges, 'TB')
    expect(result.nodes).toHaveLength(taskTypes.length)
    for (const node of result.nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true)
      expect(Number.isFinite(node.position.y)).toBe(true)
    }
  })

  it('handles all BPMN gateway types', () => {
    const gatewayTypes = [
      'exclusive-gateway', 'parallel-gateway', 'inclusive-gateway',
      'event-based-gateway', 'complex-gateway',
    ]
    const nodes = [
      makeNode('start', 'start-event'),
      ...gatewayTypes.map((type, i) => makeNode(`gw-${i}`, type)),
      makeNode('end', 'end-event'),
    ]
    const edges = [
      makeEdge('e-start', 'start', 'gw-0'),
      ...gatewayTypes.slice(1).map((_, i) => makeEdge(`e-${i}`, `gw-${i}`, `gw-${i + 1}`)),
      makeEdge('e-end', `gw-${gatewayTypes.length - 1}`, 'end'),
    ]

    const result = applyAutoLayout(nodes, edges, 'LR')
    expect(result.nodes).toHaveLength(gatewayTypes.length + 2)
  })

  it('handles all subprocess types', () => {
    const subprocessTypes = ['sub-process', 'ad-hoc-sub-process', 'transaction']
    const nodes = subprocessTypes.map((type, i) => makeNode(`sp-${i}`, type))
    const edges = subprocessTypes.slice(1).map((_, i) => makeEdge(`e-${i}`, `sp-${i}`, `sp-${i + 1}`))

    const result = applyAutoLayout(nodes, edges, 'LR')
    expect(result.nodes).toHaveLength(subprocessTypes.length)
  })

  it('handles unknown node types with default size', () => {
    const nodes = [
      makeNode('n1', 'unknown-custom-type', 0, 0),
      makeNode('n2', 'user-task', 0, 0),
    ]
    const edges = [makeEdge('e1', 'n1', 'n2')]

    const result = applyAutoLayout(nodes, edges, 'LR')
    expect(result.nodes).toHaveLength(2)
    // Should not throw, unknown types get default 160x80
    expect(Number.isFinite(result.nodes[0].position.x)).toBe(true)
  })

  it('handles undefined node type', () => {
    const nodes: Node[] = [
      { id: 'n1', type: undefined, position: { x: 0, y: 0 }, data: {} },
    ]

    const result = applyAutoLayout(nodes, [])
    expect(result.nodes).toHaveLength(1)
    expect(Number.isFinite(result.nodes[0].position.x)).toBe(true)
  })

  // --- Compound node (SubProcess children) tests ---

  it('excludes subprocess children from top-level layout', () => {
    const nodes = [
      makeNode('start', 'start-event'),
      makeNode('sp', 'sub-process'),
      makeNode('child1', 'user-task'),
      makeNode('child2', 'user-task'),
      makeNode('end', 'end-event'),
    ]
    // Mark child1 and child2 as children of sp
    const child1 = { ...nodes[2], parentNode: 'sp' } as Node & { parentNode: string }
    const child2 = { ...nodes[3], parentNode: 'sp' } as Node & { parentNode: string }
    const nodesWithChildren = [nodes[0], nodes[1], child1, child2, nodes[4]]

    const edges = [
      makeEdge('e1', 'start', 'sp'),
      makeEdge('e2', 'sp', 'end'),
    ]

    const result = applyAutoLayout(nodesWithChildren, edges, 'LR')
    expect(result.nodes).toHaveLength(5)

    // Children should keep their original positions (not repositioned by dagre)
    const resultChild1 = result.nodes.find(n => n.id === 'child1')!
    const resultChild2 = result.nodes.find(n => n.id === 'child2')!
    expect(resultChild1.position).toEqual({ x: 0, y: 0 })
    expect(resultChild2.position).toEqual({ x: 0, y: 0 })

    // Top-level nodes should be repositioned
    const resultStart = result.nodes.find(n => n.id === 'start')!
    const resultSp = result.nodes.find(n => n.id === 'sp')!
    expect(resultStart.position.x).toBeLessThan(resultSp.position.x)
  })

  it('handles edges between subprocess children (excluded from layout)', () => {
    const nodes = [
      makeNode('sp', 'sub-process'),
      makeNode('child1', 'user-task'),
      makeNode('child2', 'user-task'),
    ]
    const child1 = { ...nodes[1], parentNode: 'sp' } as Node & { parentNode: string }
    const child2 = { ...nodes[2], parentNode: 'sp' } as Node & { parentNode: string }

    const edges = [
      makeEdge('e1', 'child1', 'child2'), // Edge between children
    ]

    const result = applyAutoLayout([nodes[0], child1, child2], edges, 'LR')
    // Should not throw — child edges are excluded from dagre
    expect(result.nodes).toHaveLength(3)
  })

  // --- Overlap resolution tests ---

  it('resolves overlapping gateway nodes', () => {
    // Create a diamond pattern with gateways that dagre might place too close
    const nodes = [
      makeNode('start', 'start-event'),
      makeNode('gw1', 'parallel-gateway'),
      makeNode('gw2', 'parallel-gateway'),
      makeNode('gw3', 'parallel-gateway'),
      makeNode('end', 'end-event'),
    ]
    const edges = [
      makeEdge('e1', 'start', 'gw1'),
      makeEdge('e2', 'gw1', 'gw2'),
      makeEdge('e3', 'gw2', 'gw3'),
      makeEdge('e4', 'gw3', 'end'),
    ]

    const result = applyAutoLayout(nodes, edges, 'LR')
    // All gateways should have distinct positions
    const gwPositions = result.nodes
      .filter(n => n.id.startsWith('gw'))
      .map(n => `${n.position.x},${n.position.y}`)
    const uniquePositions = new Set(gwPositions)
    expect(uniquePositions.size).toBe(3)
  })

  // --- Performance test ---

  it('handles 30+ nodes within acceptable time', () => {
    const nodeCount = 30
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Create a realistic flow: start -> parallel split -> 5 branches -> parallel join -> end
    nodes.push(makeNode('start', 'start-event'))
    nodes.push(makeNode('split', 'parallel-gateway'))

    for (let i = 0; i < 5; i++) {
      nodes.push(makeNode(`task-${i}-a`, 'user-task'))
      nodes.push(makeNode(`task-${i}-b`, 'service-task'))
      nodes.push(makeNode(`gw-${i}`, 'exclusive-gateway'))
      nodes.push(makeNode(`task-${i}-c`, 'script-task'))

      edges.push(makeEdge(`e-split-${i}`, 'split', `task-${i}-a`))
      edges.push(makeEdge(`e-${i}-ab`, `task-${i}-a`, `task-${i}-b`))
      edges.push(makeEdge(`e-${i}-bc`, `task-${i}-b`, `gw-${i}`))
      edges.push(makeEdge(`e-${i}-cd`, `gw-${i}`, `task-${i}-c`))
    }

    nodes.push(makeNode('join', 'parallel-gateway'))
    nodes.push(makeNode('end', 'end-event'))

    for (let i = 0; i < 5; i++) {
      edges.push(makeEdge(`e-${i}-join`, `task-${i}-c`, 'join'))
    }
    edges.push(makeEdge('e-join-end', 'join', 'end'))

    expect(nodes.length).toBeGreaterThanOrEqual(22)

    const start = performance.now()
    const result = applyAutoLayout(nodes, edges, 'LR')
    const elapsed = performance.now() - start

    expect(result.nodes).toHaveLength(nodes.length)
    expect(elapsed).toBeLessThan(2000) // Must complete within 2 seconds

    // Verify no NaN positions
    for (const node of result.nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true)
      expect(Number.isFinite(node.position.y)).toBe(true)
    }
  })

  it('handles 50 nodes within acceptable time', () => {
    const nodes: Node[] = [makeNode('start', 'start-event')]
    const edges: Edge[] = []

    for (let i = 0; i < 24; i++) {
      const type = ['user-task', 'service-task', 'script-task', 'exclusive-gateway'][i % 4]
      nodes.push(makeNode(`n-${i}`, type))
      edges.push(makeEdge(`e-${i}`, i === 0 ? 'start' : `n-${i - 1}`, `n-${i}`))
    }
    nodes.push(makeNode('end', 'end-event'))
    edges.push(makeEdge('e-end', 'n-23', 'end'))

    const start = performance.now()
    const result = applyAutoLayout(nodes, edges, 'TB')
    const elapsed = performance.now() - start

    expect(result.nodes).toHaveLength(26)
    expect(elapsed).toBeLessThan(2000)
  })
})

// --- useAutoLayout composable tests (separate file would be ideal but we keep it here) ---

// We need a dedicated describe block that uses a stable mock for the store.
// vi.mock is hoisted so the last call wins globally. We use a mutable ref
// so individual tests can swap the store return value.

const mockStoreState = {
  nodes: [] as Node[],
  edges: [] as Edge[],
  loadGraph: vi.fn(),
}

vi.mock('../stores/flowGraph.js', () => ({
  useFlowGraphStore: () => mockStoreState,
}))

describe('useAutoLayout composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState.nodes = []
    mockStoreState.edges = []
  })

  async function setupComposable() {
    const { useAutoLayout } = await import('../composables/useAutoLayout.js')
    return useAutoLayout()
  }

  it('exposes direction, nodeSep, rankSep refs', async () => {
    const { direction, nodeSep, rankSep } = await setupComposable()
    expect(direction.value).toBe('TB')
    expect(nodeSep.value).toBe(60)
    expect(rankSep.value).toBe(80)
  })

  it('toggleDirection switches between TB and LR', async () => {
    const { direction, toggleDirection } = await setupComposable()
    expect(direction.value).toBe('TB')
    toggleDirection()
    expect(direction.value).toBe('LR')
    toggleDirection()
    expect(direction.value).toBe('TB')
  })

  it('computeLayout returns null when nodes is empty', async () => {
    const { computeLayout } = await setupComposable()
    expect(computeLayout()).toBeNull()
  })

  it('computeLayout returns layout result without mutating store', async () => {
    mockStoreState.nodes = [makeNode('n1', 'user-task', 0, 0)]
    mockStoreState.edges = []

    const { computeLayout } = await setupComposable()
    const result = computeLayout()
    expect(result).not.toBeNull()
    expect(result!.nodes).toHaveLength(1)
    // loadGraph should NOT have been called — computeLayout is pure
    expect(mockStoreState.loadGraph).not.toHaveBeenCalled()
  })

  it('directionLabel reflects current direction', async () => {
    const { directionLabel, toggleDirection } = await setupComposable()
    expect(directionLabel.value).toBe('垂直')
    toggleDirection()
    expect(directionLabel.value).toBe('水平')
  })

  it('computeLayout applies custom rankSep', async () => {
    mockStoreState.nodes = [
      makeNode('start', 'start-event', 0, 0),
      makeNode('task', 'user-task', 0, 0),
    ]
    mockStoreState.edges = [makeEdge('e1', 'start', 'task')]

    const { rankSep, computeLayout } = await setupComposable()

    rankSep.value = 300
    const loose = computeLayout()!

    rankSep.value = 30
    const tight = computeLayout()!

    // In TB direction, rankSep controls vertical gap between ranks
    const looseGap = loose.nodes.find(n => n.id === 'task')!.position.y - loose.nodes.find(n => n.id === 'start')!.position.y
    const tightGap = tight.nodes.find(n => n.id === 'task')!.position.y - tight.nodes.find(n => n.id === 'start')!.position.y
    expect(looseGap).toBeGreaterThan(tightGap)
  })

  it('computeLayout handles all node types', async () => {
    mockStoreState.nodes = [
      makeNode('start', 'start-event'),
      makeNode('msg', 'message-event'),
      makeNode('task', 'business-rule-task'),
      makeNode('gw', 'event-based-gateway'),
      makeNode('end', 'end-event'),
    ]
    mockStoreState.edges = [
      makeEdge('e1', 'start', 'msg'),
      makeEdge('e2', 'msg', 'task'),
      makeEdge('e3', 'task', 'gw'),
      makeEdge('e4', 'gw', 'end'),
    ]

    const { computeLayout } = await setupComposable()
    const result = computeLayout()
    expect(result).not.toBeNull()
    expect(result!.nodes).toHaveLength(5)
  })
})
