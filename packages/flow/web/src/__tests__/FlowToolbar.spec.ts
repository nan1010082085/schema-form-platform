import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FlowToolbar from '../components/FlowToolbar.vue'

const elTooltipStub = {
  template: '<span><slot /></span>',
}

function mountToolbar(props: Record<string, unknown> = {}) {
  return mount(FlowToolbar, {
    props,
    global: { stubs: { 'el-tooltip': elTooltipStub } },
  })
}

describe('FlowToolbar', () => {
  it('renders default title when no title prop provided', () => {
    const wrapper = mountToolbar()
    expect(wrapper.text()).toContain('流程设计器')
  })

  it('renders custom title from prop', () => {
    const wrapper = mountToolbar({ title: '我的流程' })
    expect(wrapper.text()).toContain('我的流程')
  })

  it('renders all toolbar buttons', () => {
    const wrapper = mountToolbar()
    const buttons = wrapper.findAll('button')
    // 14 buttons: 返回, 节点面板, 撤销, 重做, 属性面板, 导出BPMN, 导入BPMN, 版本历史, AI, 校验, 设置, 保存, 发布, 预览
    expect(buttons.length).toBe(14)
  })

  it('has correct title attributes on icon buttons', () => {
    const wrapper = mountToolbar()
    const titles = wrapper.findAll('button').map(b => b.attributes('title'))
    expect(titles).toContain('返回')
    expect(titles).toContain('撤销')
    expect(titles).toContain('重做')
    expect(titles).toContain('导出 BPMN')
    expect(titles).toContain('导入 BPMN')
    expect(titles).toContain('版本历史')
    expect(titles).toContain('校验')
    expect(titles).toContain('设置')
    expect(titles).toContain('保存')
    expect(titles).toContain('发布')
  })

  it('renders text labels for 设置, 保存 and 发布', () => {
    const wrapper = mountToolbar()
    const texts = wrapper.findAll('button').map(b => b.text()).filter(Boolean)
    expect(texts).toContain('设置')
    expect(texts).toContain('保存')
    expect(texts).toContain('发布')
  })

  it('emits back when back button clicked', async () => {
    const wrapper = mountToolbar()
    const btn = wrapper.find('button[title="返回"]')
    await btn.trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('emits undo when undo button clicked', async () => {
    const wrapper = mountToolbar()
    const btn = wrapper.find('button[title="撤销"]')
    await btn.trigger('click')
    expect(wrapper.emitted('undo')).toHaveLength(1)
  })

  it('emits redo when redo button clicked', async () => {
    const wrapper = mountToolbar()
    const btn = wrapper.find('button[title="重做"]')
    await btn.trigger('click')
    expect(wrapper.emitted('redo')).toHaveLength(1)
  })

  it('emits export-bpmn when export button clicked', async () => {
    const wrapper = mountToolbar()
    const btn = wrapper.find('button[title="导出 BPMN"]')
    await btn.trigger('click')
    expect(wrapper.emitted('export-bpmn')).toHaveLength(1)
  })

  it('emits import-bpmn when import button clicked', async () => {
    const wrapper = mountToolbar()
    const btn = wrapper.find('button[title="导入 BPMN"]')
    await btn.trigger('click')
    expect(wrapper.emitted('import-bpmn')).toHaveLength(1)
  })

  it('emits validate when validate button clicked', async () => {
    const wrapper = mountToolbar()
    const btn = wrapper.find('button[title="校验"]')
    await btn.trigger('click')
    expect(wrapper.emitted('validate')).toHaveLength(1)
  })

  it('emits publish when publish button clicked', async () => {
    const wrapper = mountToolbar()
    const btn = wrapper.find('button[title="发布"]')
    await btn.trigger('click')
    expect(wrapper.emitted('publish')).toHaveLength(1)
  })

  it('emits settings when settings button clicked', async () => {
    const wrapper = mountToolbar()
    const btn = wrapper.find('button[title="设置"]')
    await btn.trigger('click')
    expect(wrapper.emitted('settings')).toHaveLength(1)
  })

  it('emits save when save button clicked', async () => {
    const wrapper = mountToolbar()
    const btn = wrapper.find('button[title="保存"]')
    await btn.trigger('click')
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('emits version-history when version history button clicked', async () => {
    const wrapper = mountToolbar()
    const btn = wrapper.find('button[title="版本历史"]')
    await btn.trigger('click')
    expect(wrapper.emitted('version-history')).toHaveLength(1)
  })

  it('groups undo/redo buttons adjacent to each other', () => {
    const wrapper = mountToolbar()
    const buttons = wrapper.findAll('button')
    const titles = buttons.map(b => b.attributes('title'))
    const undoIdx = titles.indexOf('撤销')
    const redoIdx = titles.indexOf('重做')
    expect(undoIdx).toBeGreaterThanOrEqual(0)
    expect(redoIdx).toBeGreaterThanOrEqual(0)
    expect(Math.abs(undoIdx - redoIdx)).toBe(1)
  })

  it('groups export/import buttons adjacent to each other', () => {
    const wrapper = mountToolbar()
    const buttons = wrapper.findAll('button')
    const titles = buttons.map(b => b.attributes('title'))
    const exportIdx = titles.indexOf('导出 BPMN')
    const importIdx = titles.indexOf('导入 BPMN')
    expect(exportIdx).toBeGreaterThanOrEqual(0)
    expect(importIdx).toBeGreaterThanOrEqual(0)
    expect(Math.abs(exportIdx - importIdx)).toBe(1)
  })
})
