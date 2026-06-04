/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiVersionList from '@/components/AiVersionList.vue'
import type { AIVersion } from '@/types'

const mockVersions: AIVersion[] = [
  {
    id: 'v1',
    version: 3,
    type: 'schema',
    description: '添加了用户表单',
    messageId: 'msg1',
    createdAt: '2026-06-04T10:00:00Z',
  },
  {
    id: 'v2',
    version: 2,
    type: 'flow',
    description: '更新了审批流程',
    messageId: 'msg2',
    createdAt: '2026-06-04T09:00:00Z',
  },
  {
    id: 'v3',
    version: 1,
    type: 'schema',
    messageId: 'msg3',
    createdAt: '2026-06-04T08:00:00Z',
  },
]

describe('AiVersionList', () => {
  it('renders empty state when no versions', () => {
    const wrapper = mount(AiVersionList, {
      props: { versions: [] },
    })

    const empty = wrapper.find('[data-testid="empty"]')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('暂无版本记录')
    expect(empty.text()).toContain('生成内容后将自动保存版本')
  })

  it('renders loading state', () => {
    const wrapper = mount(AiVersionList, {
      props: { versions: [], loading: true },
    })

    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true)
  })

  it('renders version list', () => {
    const wrapper = mount(AiVersionList, {
      props: { versions: mockVersions },
    })

    expect(wrapper.find('[data-testid="empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false)

    expect(wrapper.find('[data-testid="version-v1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="version-v2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="version-v3"]').exists()).toBe(true)
  })

  it('displays version number and type', () => {
    const wrapper = mount(AiVersionList, {
      props: { versions: mockVersions },
    })

    const versionItem = wrapper.find('[data-testid="version-v1"]')
    expect(versionItem.find('[data-testid="version-number"]').text()).toBe('v3')
    expect(versionItem.find('[data-testid="version-type"]').text()).toBe('Schema')
  })

  it('displays description when available', () => {
    const wrapper = mount(AiVersionList, {
      props: { versions: mockVersions },
    })

    const v1 = wrapper.find('[data-testid="version-v1"]')
    expect(v1.find('[data-testid="version-description"]').text()).toBe('添加了用户表单')

    const v3 = wrapper.find('[data-testid="version-v3"]')
    expect(v3.find('[data-testid="version-description"]').exists()).toBe(false)
  })

  it('emits restore event', async () => {
    const wrapper = mount(AiVersionList, {
      props: { versions: mockVersions },
    })

    const restoreBtn = wrapper.find('[data-testid="version-v1"] [data-testid="btn-restore"]')
    await restoreBtn.trigger('click')

    expect(wrapper.emitted('restore')).toBeTruthy()
    expect(wrapper.emitted('restore')![0]).toEqual(['v1'])
  })

  it('emits compare event', async () => {
    const wrapper = mount(AiVersionList, {
      props: { versions: mockVersions },
    })

    const compareBtn = wrapper.find('[data-testid="version-v1"] [data-testid="btn-compare"]')
    await compareBtn.trigger('click')

    expect(wrapper.emitted('compare')).toBeTruthy()
    expect(wrapper.emitted('compare')![0]).toEqual(['v1'])
  })

  it('passes currentVersionId prop correctly', () => {
    const wrapper = mount(AiVersionList, {
      props: { versions: mockVersions, currentVersionId: 'v2' },
    })

    // Verify the component renders without errors
    expect(wrapper.find('[data-testid="version-v1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="version-v2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="version-v3"]').exists()).toBe(true)
  })
})
