import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlowGraphStore } from '../stores/flowGraph.js'
import { useSimulation } from '../composables/useSimulation.js'

/**
 * Build a simple linear flow: Start -> UserTask -> End
 */
function buildLinearFlow(graphStore: ReturnType<typeof useFlowGraphStore>) {
  graphStore.loadFromFlowGraph({
    nodes: [
      { id: 'start', shape: 'bpmn-start-event', x: 0, y: 0, width: 200, height: 36, data: { bpmnType: 'startEvent', label: '开始' } },
      { id: 'task1', shape: 'bpmn-user-task', x: 0, y: 100, width: 160, height: 80, data: { bpmnType: 'userTask', label: '审批', assigneeType: 'user', candidateUsers: ['u1'] } },
      { id: 'end', shape: 'bpmn-end-event', x: 0, y: 200, width: 200, height: 36, data: { bpmnType: 'endEvent', label: '结束' } },
    ],
    edges: [
      { id: 'e1', shape: 'smoothstep', source: { cell: 'start' }, target: { cell: 'task1' }, data: {} },
      { id: 'e2', shape: 'smoothstep', source: { cell: 'task1' }, target: { cell: 'end' }, data: {} },
    ],
  })
}

/**
 * Build a flow with exclusive gateway: Start -> Gateway -> (TaskA | TaskB) -> End
 */
function buildExclusiveGatewayFlow(graphStore: ReturnType<typeof useFlowGraphStore>) {
  graphStore.loadFromFlowGraph({
    nodes: [
      { id: 'start', shape: 'bpmn-start-event', x: 0, y: 0, width: 200, height: 36, data: { bpmnType: 'startEvent', label: '开始' } },
      { id: 'gw', shape: 'bpmn-exclusive-gateway', x: 0, y: 100, width: 40, height: 40, data: { bpmnType: 'exclusiveGateway', label: '条件判断' } },
      { id: 'taskA', shape: 'bpmn-user-task', x: -100, y: 200, width: 160, height: 80, data: { bpmnType: 'userTask', label: '任务A' } },
      { id: 'taskB', shape: 'bpmn-user-task', x: 100, y: 200, width: 160, height: 80, data: { bpmnType: 'userTask', label: '任务B' } },
      { id: 'end', shape: 'bpmn-end-event', x: 0, y: 300, width: 200, height: 36, data: { bpmnType: 'endEvent', label: '结束' } },
    ],
    edges: [
      { id: 'e1', shape: 'smoothstep', source: { cell: 'start' }, target: { cell: 'gw' }, data: {} },
      { id: 'e2', shape: 'smoothstep', source: { cell: 'gw' }, target: { cell: 'taskA' }, data: { isDefault: true } },
      { id: 'e3', shape: 'smoothstep', source: { cell: 'gw' }, target: { cell: 'taskB' }, data: { conditionExpression: '${amount > 1000}' } },
      { id: 'e4', shape: 'smoothstep', source: { cell: 'taskA' }, target: { cell: 'end' }, data: {} },
      { id: 'e5', shape: 'smoothstep', source: { cell: 'taskB' }, target: { cell: 'end' }, data: {} },
    ],
  })
}

/**
 * Build a flow with parallel gateway: Start -> ParallelGW -> (TaskA & TaskB) -> JoinGW -> End
 */
function buildParallelGatewayFlow(graphStore: ReturnType<typeof useFlowGraphStore>) {
  graphStore.loadFromFlowGraph({
    nodes: [
      { id: 'start', shape: 'bpmn-start-event', x: 0, y: 0, width: 200, height: 36, data: { bpmnType: 'startEvent', label: '开始' } },
      { id: 'split', shape: 'bpmn-parallel-gateway', x: 0, y: 100, width: 40, height: 40, data: { bpmnType: 'parallelGateway', label: '并行分支' } },
      { id: 'taskA', shape: 'bpmn-user-task', x: -100, y: 200, width: 160, height: 80, data: { bpmnType: 'userTask', label: '任务A' } },
      { id: 'taskB', shape: 'bpmn-user-task', x: 100, y: 200, width: 160, height: 80, data: { bpmnType: 'userTask', label: '任务B' } },
      { id: 'join', shape: 'bpmn-parallel-gateway', x: 0, y: 300, width: 40, height: 40, data: { bpmnType: 'parallelGateway', label: '并行汇聚' } },
      { id: 'end', shape: 'bpmn-end-event', x: 0, y: 400, width: 200, height: 36, data: { bpmnType: 'endEvent', label: '结束' } },
    ],
    edges: [
      { id: 'e1', shape: 'smoothstep', source: { cell: 'start' }, target: { cell: 'split' }, data: {} },
      { id: 'e2', shape: 'smoothstep', source: { cell: 'split' }, target: { cell: 'taskA' }, data: {} },
      { id: 'e3', shape: 'smoothstep', source: { cell: 'split' }, target: { cell: 'taskB' }, data: {} },
      { id: 'e4', shape: 'smoothstep', source: { cell: 'taskA' }, target: { cell: 'join' }, data: {} },
      { id: 'e5', shape: 'smoothstep', source: { cell: 'taskB' }, target: { cell: 'join' }, data: {} },
      { id: 'e6', shape: 'smoothstep', source: { cell: 'join' }, target: { cell: 'end' }, data: {} },
    ],
  })
}

describe('useSimulation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('linear flow', () => {
    it('starts simulation at the start node', () => {
      const graphStore = useFlowGraphStore()
      buildLinearFlow(graphStore)

      const sim = useSimulation()
      sim.startSimulation()

      expect(sim.isSimulating.value).toBe(true)
      expect(sim.activeNodeId.value).toBe('start')
      expect(sim.currentStep.value).toBe(0)
      expect(sim.statusMessage.value).toContain('开始')
    })

    it('steps forward through nodes', () => {
      const graphStore = useFlowGraphStore()
      buildLinearFlow(graphStore)

      const sim = useSimulation()
      sim.startSimulation()

      // Step 1: Start -> UserTask
      const result1 = sim.stepForward()
      expect(result1).toBe(true)
      expect(sim.activeNodeId.value).toBe('task1')
      expect(sim.currentStep.value).toBe(1)
      expect(sim.statusMessage.value).toContain('审批')

      // Step 2: UserTask -> End
      const result2 = sim.stepForward()
      expect(result2).toBe(true)
      expect(sim.activeNodeId.value).toBe('end')
      expect(sim.currentStep.value).toBe(2)
    })

    it('stops at end node', () => {
      const graphStore = useFlowGraphStore()
      buildLinearFlow(graphStore)

      const sim = useSimulation()
      sim.startSimulation()
      sim.stepForward() // -> task1
      sim.stepForward() // -> end
      const result = sim.stepForward() // should stop

      expect(result).toBe(false)
      expect(sim.statusMessage.value).toContain('结束')
    })

    it('tracks visited nodes', () => {
      const graphStore = useFlowGraphStore()
      buildLinearFlow(graphStore)

      const sim = useSimulation()
      sim.startSimulation()
      sim.stepForward()
      sim.stepForward()

      expect(sim.simulationPath.value).toEqual(['start', 'task1', 'end'])
      expect(sim.visitedNodeIds.value.has('start')).toBe(true)
      expect(sim.visitedNodeIds.value.has('task1')).toBe(true)
      expect(sim.visitedNodeIds.value.has('end')).toBe(true)
    })

    it('resets to start node', () => {
      const graphStore = useFlowGraphStore()
      buildLinearFlow(graphStore)

      const sim = useSimulation()
      sim.startSimulation()
      sim.stepForward()
      sim.stepForward()

      sim.resetSimulation()

      expect(sim.activeNodeId.value).toBe('start')
      expect(sim.currentStep.value).toBe(0)
      expect(sim.simulationPath.value).toEqual(['start'])
    })

    it('stops simulation completely', () => {
      const graphStore = useFlowGraphStore()
      buildLinearFlow(graphStore)

      const sim = useSimulation()
      sim.startSimulation()
      sim.stepForward()

      sim.stopSimulation()

      expect(sim.isSimulating.value).toBe(false)
      expect(sim.activeNodeId.value).toBeNull()
      expect(sim.currentStep.value).toBe(0)
      expect(sim.simulationPath.value).toEqual([])
    })
  })

  describe('exclusive gateway flow', () => {
    it('follows default edge at exclusive gateway', () => {
      const graphStore = useFlowGraphStore()
      buildExclusiveGatewayFlow(graphStore)

      const sim = useSimulation()
      sim.startSimulation()
      sim.stepForward() // start -> gateway
      sim.stepForward() // gateway -> taskA (default)

      expect(sim.activeNodeId.value).toBe('taskA')
      expect(sim.statusMessage.value).toContain('任务A')
    })
  })

  describe('parallel gateway flow', () => {
    it('follows all branches at parallel gateway', () => {
      const graphStore = useFlowGraphStore()
      buildParallelGatewayFlow(graphStore)

      const sim = useSimulation()
      sim.startSimulation()
      sim.stepForward() // start -> split
      const result = sim.stepForward() // split -> taskA, taskB

      expect(result).toBe(true)
      // Active nodes should include both branches
      expect(sim.activeNodeIds.value).toContain('taskA')
      expect(sim.activeNodeIds.value).toContain('taskB')
      expect(sim.activeNodeIds.value.length).toBe(2)
      expect(sim.statusMessage.value).toContain('并行分支')
    })
  })

  describe('no start node', () => {
    it('shows error when no start node exists', () => {
      const graphStore = useFlowGraphStore()
      graphStore.loadFromFlowGraph({
        nodes: [
          { id: 'end', shape: 'bpmn-end-event', x: 0, y: 0, width: 200, height: 36, data: { bpmnType: 'endEvent', label: '结束' } },
        ],
        edges: [],
      })

      const sim = useSimulation()
      sim.startSimulation()

      expect(sim.isSimulating.value).toBe(false)
      expect(sim.statusMessage.value).toContain('未找到开始节点')
    })
  })

  describe('speed control', () => {
    it('cycles through speed options', () => {
      const graphStore = useFlowGraphStore()
      buildLinearFlow(graphStore)

      const sim = useSimulation()
      expect(sim.speed.value).toBe('normal')

      sim.cycleSpeed()
      expect(sim.speed.value).toBe('fast')

      sim.cycleSpeed()
      expect(sim.speed.value).toBe('slow')

      sim.cycleSpeed()
      expect(sim.speed.value).toBe('normal')
    })
  })

  describe('stepForward when not simulating', () => {
    it('returns false when not simulating', () => {
      const graphStore = useFlowGraphStore()
      buildLinearFlow(graphStore)

      const sim = useSimulation()
      const result = sim.stepForward()
      expect(result).toBe(false)
    })
  })
})
