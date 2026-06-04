import { describe, it, expect } from 'vitest'
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

    // start should be left of task, task left of end
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

    // start should be above task, task above end
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

    // gateway should be left of tasks
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
})
