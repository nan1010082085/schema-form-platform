import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

/* ------------------------------------------------------------------ */
/*  Mocks — @vue-flow                                                  */
/* ------------------------------------------------------------------ */

vi.mock('@vue-flow/core', () => ({
  VueFlow: {
    template: '<div data-testid="vue-flow"><slot /></div>',
    props: ['nodes', 'edges', 'defaultEdgeOptions', 'snapToGrid', 'snapGrid', 'fitViewOnInit'],
    emits: ['update:nodes', 'update:edges'],
  },
  useVueFlow: () => ({
    onNodeClick: vi.fn(),
    onEdgeClick: vi.fn(),
    onPaneClick: vi.fn(),
    onConnect: vi.fn(),
    addNodes: vi.fn(),
    addEdges: vi.fn(),
    getNodes: { value: [] },
    getEdges: { value: [] },
    toObject: vi.fn(() => ({ nodes: [], edges: [] })),
    removeNodes: vi.fn(),
    removeEdges: vi.fn(),
    fitView: vi.fn(),
    screenToFlowCoordinate: vi.fn(() => ({ x: 0, y: 0 })),
  }),
  MarkerType: { ArrowClosed: 'arrow-closed' },
  Handle: { template: '<div />', props: ['type', 'position'] },
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}))

vi.mock('@vue-flow/background', () => ({
  Background: {
    template: '<div data-testid="background" />',
    props: ['gap', 'size'],
  },
}))

vi.mock('@vue-flow/controls', () => ({
  Controls: {
    template: '<div data-testid="controls" />',
    props: [],
  },
}))

vi.mock('@vue-flow/core/dist/style.css', () => ({ default: {} }))
vi.mock('@vue-flow/core/dist/theme-default.css', () => ({ default: {} }))

/* ------------------------------------------------------------------ */
/*  Mocks — node components                                            */
/* ------------------------------------------------------------------ */

vi.mock('../components/nodes/index.js', () => ({
  StartEventNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  EndEventNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  TimerEventNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  UserTaskNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  ServiceTaskNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  ScriptTaskNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  SendTaskNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  ReceiveTaskNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  ExclusiveGatewayNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  ParallelGatewayNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  InclusiveGatewayNode: { template: '<div />', props: ['id', 'data', 'selected'] },
}))

vi.mock('../components/nodes/index.ts', () => ({
  StartEventNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  EndEventNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  TimerEventNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  UserTaskNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  ServiceTaskNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  ScriptTaskNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  SendTaskNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  ReceiveTaskNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  ExclusiveGatewayNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  ParallelGatewayNode: { template: '<div />', props: ['id', 'data', 'selected'] },
  InclusiveGatewayNode: { template: '<div />', props: ['id', 'data', 'selected'] },
}))

/* ------------------------------------------------------------------ */
/*  Mocks — stores                                                     */
/* ------------------------------------------------------------------ */

vi.mock('../stores/flowDesigner.js', () => ({
  useFlowDesignerStore: () => ({
    selectNode: vi.fn(),
    selectEdge: vi.fn(),
    clearSelection: vi.fn(),
    pushHistory: vi.fn(),
  }),
}))

vi.mock('../stores/flowDesigner.ts', () => ({
  useFlowDesignerStore: () => ({
    selectNode: vi.fn(),
    selectEdge: vi.fn(),
    clearSelection: vi.fn(),
    pushHistory: vi.fn(),
  }),
}))

vi.mock('../stores/flowGraph.js', () => ({
  useFlowGraphStore: () => ({
    nodes: { value: [] },
    edges: { value: [] },
    addNode: vi.fn(),
    removeNode: vi.fn(),
    removeEdge: vi.fn(),
    addEdge: vi.fn(),
    getSnapshot: vi.fn(() => ({ nodes: [], edges: [] })),
  }),
}))

vi.mock('../stores/flowGraph.ts', () => ({
  useFlowGraphStore: () => ({
    nodes: { value: [] },
    edges: { value: [] },
    addNode: vi.fn(),
    removeNode: vi.fn(),
    removeEdge: vi.fn(),
    addEdge: vi.fn(),
    getSnapshot: vi.fn(() => ({ nodes: [], edges: [] })),
  }),
}))

/* ------------------------------------------------------------------ */
/*  Import AFTER mocks                                                 */
/* ------------------------------------------------------------------ */

import FlowCanvas from '../components/FlowCanvas.vue'

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

function mountCanvas(props: Record<string, unknown> = {}) {
  return mount(FlowCanvas, {
    props,
    global: {
      stubs: {
        ElInput: { template: '<input />' },
      },
    },
  })
}

describe('FlowCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts without errors', () => {
    const wrapper = mountCanvas()
    expect(wrapper.exists()).toBe(true)
  })

  it('renders VueFlow component', () => {
    const wrapper = mountCanvas()
    const vueFlow = wrapper.find('[data-testid="vue-flow"]')
    expect(vueFlow.exists()).toBe(true)
  })

  it('renders Background component', () => {
    const wrapper = mountCanvas()
    const bg = wrapper.find('[data-testid="background"]')
    expect(bg.exists()).toBe(true)
  })

  it('renders Controls component', () => {
    const wrapper = mountCanvas()
    const controls = wrapper.find('[data-testid="controls"]')
    expect(controls.exists()).toBe(true)
  })

  it('exposes fitView method via wrapper.vm', () => {
    const wrapper = mountCanvas()
    expect(typeof (wrapper.vm as any).fitView).toBe('function')
  })
})
