/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiPreviewCompare from '@/components/AiPreviewCompare.vue'
import type { Widget, FlowGraph } from '@/types'

describe('AiPreviewCompare', () => {
  const mockSchemaBefore: Widget[] = [
    { id: 'w1', type: 'input', field: 'name', label: '姓名' },
    { id: 'w2', type: 'input', field: 'email', label: '邮箱' },
  ]

  const mockSchemaAfter: Widget[] = [
    { id: 'w1', type: 'input', field: 'name', label: '姓名（已修改）' },
    { id: 'w3', type: 'select', field: 'role', label: '角色' },
  ]

  const mockFlowBefore: FlowGraph = {
    nodes: [
      { id: 'n1', data: { bpmnType: 'startEvent', label: '开始' } },
      { id: 'n2', data: { bpmnType: 'userTask', label: '审批' } },
    ],
    edges: [
      { id: 'e1', source: { cell: 'n1' }, target: { cell: 'n2' } },
    ],
  }

  const mockFlowAfter: FlowGraph = {
    nodes: [
      { id: 'n1', data: { bpmnType: 'startEvent', label: '开始' } },
      { id: 'n3', data: { bpmnType: 'serviceTask', label: '自动处理' } },
    ],
    edges: [
      { id: 'e1', source: { cell: 'n1' }, target: { cell: 'n3' } },
    ],
  }

  it('renders schema diff correctly', () => {
    const wrapper = mount(AiPreviewCompare, {
      props: {
        before: mockSchemaBefore,
        after: mockSchemaAfter,
        type: 'schema',
      },
    })

    expect(wrapper.text()).toContain('版本对比')
    expect(wrapper.text()).toContain('新增')
    expect(wrapper.text()).toContain('删除')
    expect(wrapper.text()).toContain('修改')
  })

  it('renders flow diff correctly', () => {
    const wrapper = mount(AiPreviewCompare, {
      props: {
        before: mockFlowBefore,
        after: mockFlowAfter,
        type: 'flow',
      },
    })

    expect(wrapper.text()).toContain('版本对比')
    expect(wrapper.text()).toContain('节点')
    expect(wrapper.text()).toContain('连线')
  })

  it('shows no diff message when versions are identical', () => {
    const wrapper = mount(AiPreviewCompare, {
      props: {
        before: mockSchemaBefore,
        after: [...mockSchemaBefore],
        type: 'schema',
      },
    })

    expect(wrapper.find('[data-testid="no-diff"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('两个版本完全相同')
  })

  it('shows summary with correct counts', () => {
    const wrapper = mount(AiPreviewCompare, {
      props: {
        before: mockSchemaBefore,
        after: mockSchemaAfter,
        type: 'schema',
      },
    })

    const summary = wrapper.find('[data-testid="summary"]')
    expect(summary.exists()).toBe(true)

    // Should show counts for added, removed, changed
    expect(summary.text()).toContain('新增')
    expect(summary.text()).toContain('删除')
    expect(summary.text()).toContain('修改')
  })

  it('emits close when close button is clicked', async () => {
    const wrapper = mount(AiPreviewCompare, {
      props: {
        before: mockSchemaBefore,
        after: mockSchemaAfter,
        type: 'schema',
      },
    })

    const closeBtn = wrapper.find('[class*="closeBtn"]')
    await closeBtn.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits apply-all when apply all button is clicked', async () => {
    const wrapper = mount(AiPreviewCompare, {
      props: {
        before: mockSchemaBefore,
        after: mockSchemaAfter,
        type: 'schema',
      },
    })

    const applyBtn = wrapper.find('[class*="btnPrimary"]')
    await applyBtn.trigger('click')

    expect(wrapper.emitted('apply-selected')).toBeTruthy()
  })

  it('shows apply buttons when there are diffs', () => {
    const wrapper = mount(AiPreviewCompare, {
      props: {
        before: mockSchemaBefore,
        after: mockSchemaAfter,
        type: 'schema',
      },
    })

    expect(wrapper.text()).toContain('应用全部变更')
    expect(wrapper.text()).toContain('部分应用')
  })

  it('does not show apply buttons when versions are identical', () => {
    const wrapper = mount(AiPreviewCompare, {
      props: {
        before: mockSchemaBefore,
        after: [...mockSchemaBefore],
        type: 'schema',
      },
    })

    expect(wrapper.text()).not.toContain('应用全部变更')
    expect(wrapper.text()).not.toContain('部分应用')
  })

  it('displays custom labels', () => {
    const wrapper = mount(AiPreviewCompare, {
      props: {
        before: mockSchemaBefore,
        after: mockSchemaAfter,
        type: 'schema',
        beforeLabel: '原始版本',
        afterLabel: '修改版本',
      },
    })

    expect(wrapper.text()).toContain('原始版本')
    expect(wrapper.text()).toContain('修改版本')
  })

  it('shows changed fields for schema diff', () => {
    const wrapper = mount(AiPreviewCompare, {
      props: {
        before: mockSchemaBefore,
        after: mockSchemaAfter,
        type: 'schema',
      },
    })

    // Should show changed field tags
    const changeTags = wrapper.findAll('[class*="changeTag"]')
    expect(changeTags.length).toBeGreaterThan(0)
  })
})
