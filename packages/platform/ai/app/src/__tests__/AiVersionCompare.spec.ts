/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiVersionCompare from '@/components/AiVersionCompare.vue'
import type { Widget, FlowGraph } from '@/types'

const schemaV1: Widget[] = [
  { id: '1', type: 'input', field: 'name', label: '姓名' },
  { id: '2', type: 'select', field: 'gender', label: '性别' },
]

const schemaV2: Widget[] = [
  { id: '1', type: 'input', field: 'name', label: '姓名' },
  { id: '3', type: 'textarea', field: 'bio', label: '简介' },
]

const flowV1: FlowGraph = {
  nodes: [
    { id: 'n1', data: { bpmnType: 'startEvent', label: '开始' } },
    { id: 'n2', data: { bpmnType: 'userTask', label: '审批' } },
  ],
  edges: [
    { id: 'e1', source: { cell: 'n1' }, target: { cell: 'n2' } },
  ],
}

const flowV2: FlowGraph = {
  nodes: [
    { id: 'n1', data: { bpmnType: 'startEvent', label: '开始' } },
    { id: 'n2', data: { bpmnType: 'serviceTask', label: '自动处理' } },
    { id: 'n3', data: { bpmnType: 'endEvent', label: '结束' } },
  ],
  edges: [
    { id: 'e1', source: { cell: 'n1' }, target: { cell: 'n2' } },
    { id: 'e2', source: { cell: 'n2' }, target: { cell: 'n3' } },
  ],
}

describe('AiVersionCompare', () => {
  it('renders header with title', () => {
    const wrapper = mount(AiVersionCompare, {
      props: {
        current: schemaV1,
        compare: schemaV2,
        type: 'schema',
      },
    })

    expect(wrapper.text()).toContain('版本对比')
  })

  it('shows summary for schema comparison', () => {
    const wrapper = mount(AiVersionCompare, {
      props: {
        current: schemaV1,
        compare: schemaV2,
        type: 'schema',
      },
    })

    const summary = wrapper.find('[data-testid="summary"]')
    expect(summary.exists()).toBe(true)
    expect(summary.text()).toContain('新增')
    expect(summary.text()).toContain('删除')
  })

  it('shows no diff message when versions are identical', () => {
    const wrapper = mount(AiVersionCompare, {
      props: {
        current: schemaV1,
        compare: [...schemaV1],
        type: 'schema',
      },
    })

    const noDiff = wrapper.find('[data-testid="no-diff"]')
    expect(noDiff.exists()).toBe(true)
    expect(noDiff.text()).toBe('两个版本完全相同')
  })

  it('emits close event', async () => {
    const wrapper = mount(AiVersionCompare, {
      props: {
        current: schemaV1,
        compare: schemaV2,
        type: 'schema',
      },
    })

    // Find the close button by its text content
    const closeBtn = wrapper.findAll('button').find(b => b.text().includes(''))
    if (closeBtn) {
      await closeBtn.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    }
  })

  it('handles null current content', () => {
    const wrapper = mount(AiVersionCompare, {
      props: {
        current: null,
        compare: schemaV2,
        type: 'schema',
      },
    })

    // Should not crash
    expect(wrapper.find('[data-testid="summary"]').exists()).toBe(true)
  })

  it('handles null compare content', () => {
    const wrapper = mount(AiVersionCompare, {
      props: {
        current: schemaV1,
        compare: null,
        type: 'schema',
      },
    })

    // Should not crash
    expect(wrapper.find('[data-testid="summary"]').exists()).toBe(true)
  })

  it('handles flow comparison', () => {
    const wrapper = mount(AiVersionCompare, {
      props: {
        current: flowV1,
        compare: flowV2,
        type: 'flow',
      },
    })

    expect(wrapper.find('[data-testid="summary"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="no-diff"]').exists()).toBe(false)
  })
})
