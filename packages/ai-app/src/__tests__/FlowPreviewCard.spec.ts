/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FlowPreviewCard from '@/components/FlowPreviewCard.vue'
import type { FlowGraph } from '@/types'

// Mock Vue Flow and related components
vi.mock('@vue-flow/core', () => ({
  VueFlow: {
    name: 'VueFlow',
    props: ['id', 'nodes', 'edges', 'nodesDraggable', 'nodesConnectable', 'edgesUpdatable', 'elementsSelectable', 'defaultViewport', 'minZoom', 'maxZoom', 'fitViewOnInit'],
    template: '<div class="vue-flow-mock"><slot v-for="(_, name) in $slots" :name="name" :data="{}" /></div>',
  },
  useVueFlow: () => ({
    onNodeClick: vi.fn(),
    fitView: vi.fn(),
  }),
  MarkerType: { ArrowClosed: 'arrowclosed' },
  Handle: { name: 'Handle', props: ['type', 'position'], template: '<div />' },
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}))

vi.mock('@vue-flow/background', () => ({
  Background: { name: 'Background', props: ['gap', 'size', 'color'], template: '<div />' },
}))

vi.mock('@vue-flow/controls', () => ({
  Controls: { name: 'Controls', props: ['showInteractive'], template: '<div />' },
}))

// Stub flow-preview node components
vi.mock('@/components/flow-preview', () => ({
  PreviewStartEvent: { name: 'PreviewStartEvent', props: ['data'], template: '<div class="preview-start" />' },
  PreviewEndEvent: { name: 'PreviewEndEvent', props: ['data'], template: '<div class="preview-end" />' },
  PreviewTask: { name: 'PreviewTask', props: ['data'], template: '<div class="preview-task" />' },
  PreviewGateway: { name: 'PreviewGateway', props: ['data'], template: '<div class="preview-gateway" />' },
}))

const mockGraph: FlowGraph = {
  nodes: [
    {
      id: 'start-1',
      data: { bpmnType: 'startEvent', label: '开始' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'task-1',
      data: { bpmnType: 'userTask', label: '审批' },
      position: { x: 200, y: 0 },
    },
    {
      id: 'gw-1',
      data: { bpmnType: 'exclusiveGateway', label: '条件判断' },
      position: { x: 400, y: 0 },
    },
    {
      id: 'end-1',
      data: { bpmnType: 'endEvent', label: '结束' },
      position: { x: 600, y: 0 },
    },
  ],
  edges: [
    { id: 'e1', source: { cell: 'start-1' }, target: { cell: 'task-1' } },
    { id: 'e2', source: { cell: 'task-1' }, target: { cell: 'gw-1' } },
    { id: 'e3', source: { cell: 'gw-1' }, target: { cell: 'end-1' }, data: { label: '通过' } },
  ],
}

describe('FlowPreviewCard', () => {
  it('renders title', () => {
    const wrapper = mount(FlowPreviewCard, {
      props: {
        title: '测试流程',
        graph: mockGraph,
      },
    })
    expect(wrapper.text()).toContain('测试流程')
  })

  it('shows node and edge count in badge', () => {
    const wrapper = mount(FlowPreviewCard, {
      props: {
        title: '测试流程',
        graph: mockGraph,
      },
    })
    expect(wrapper.text()).toContain('4 节点 / 3 连线')
  })

  it('renders action buttons', () => {
    const wrapper = mount(FlowPreviewCard, {
      props: {
        title: '测试流程',
        graph: mockGraph,
        primaryAction: '确认发布',
        secondaryAction: '在编辑器中打开',
      },
    })
    expect(wrapper.text()).toContain('确认发布')
    expect(wrapper.text()).toContain('在编辑器中打开')
  })

  it('emits primary-action on button click', async () => {
    const wrapper = mount(FlowPreviewCard, {
      props: {
        title: '测试流程',
        graph: mockGraph,
      },
    })
    const primaryBtn = wrapper.find('[class*="btnPrimary"]')
    await primaryBtn.trigger('click')
    expect(wrapper.emitted('primary-action')).toBeTruthy()
  })

  it('emits secondary-action on button click', async () => {
    const wrapper = mount(FlowPreviewCard, {
      props: {
        title: '测试流程',
        graph: mockGraph,
      },
    })
    const secondaryBtn = wrapper.find('[class*="btnGhost"]')
    await secondaryBtn.trigger('click')
    expect(wrapper.emitted('secondary-action')).toBeTruthy()
  })

  it('handles empty graph gracefully', () => {
    const wrapper = mount(FlowPreviewCard, {
      props: {
        title: '空流程',
        graph: { nodes: [], edges: [] },
      },
    })
    expect(wrapper.text()).toContain('空流程')
    expect(wrapper.text()).toContain('0 节点 / 0 连线')
  })

  it('renders Vue Flow canvas', () => {
    const wrapper = mount(FlowPreviewCard, {
      props: {
        title: '测试流程',
        graph: mockGraph,
      },
    })
    expect(wrapper.find('.vue-flow-mock').exists()).toBe(true)
  })

  it('applies compact class when compact prop is true', () => {
    const wrapper = mount(FlowPreviewCard, {
      props: {
        title: '测试流程',
        graph: mockGraph,
        compact: true,
      },
    })
    expect(wrapper.find('[class*="compact"]').exists()).toBe(true)
  })

  it('hides actions when both are empty', () => {
    const wrapper = mount(FlowPreviewCard, {
      props: {
        title: '测试流程',
        graph: mockGraph,
        primaryAction: '',
        secondaryAction: '',
      },
    })
    expect(wrapper.find('[class*="actions"]').exists()).toBe(false)
  })
})
