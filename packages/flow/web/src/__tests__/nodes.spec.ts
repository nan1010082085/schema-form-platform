import { describe, it, expect } from 'vitest'
import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import StartEvent from '../components/nodes/StartEvent.vue'
import EndEvent from '../components/nodes/EndEvent.vue'
import TimerEvent from '../components/nodes/TimerEvent.vue'
import UserTask from '../components/nodes/UserTask.vue'
import ServiceTask from '../components/nodes/ServiceTask.vue'
import ScriptTask from '../components/nodes/ScriptTask.vue'
import SendTask from '../components/nodes/SendTask.vue'
import ReceiveTask from '../components/nodes/ReceiveTask.vue'
import ExclusiveGateway from '../components/nodes/ExclusiveGateway.vue'
import ParallelGateway from '../components/nodes/ParallelGateway.vue'
import InclusiveGateway from '../components/nodes/InclusiveGateway.vue'

const stubs = {
  Handle: { template: '<div />', props: ['type', 'position', 'id'] },
}

interface NodeTestConfig {
  name: string
  component: ComponentMountingOptions['']['component']
  /** Default label text rendered by the component */
  defaultLabel?: string
  /** Static symbol for gateway nodes */
  symbol?: string
  /** Whether this node renders an SVG icon */
  hasIcon?: boolean
}

const nodes: NodeTestConfig[] = [
  { name: 'StartEvent', component: StartEvent, defaultLabel: '开始' },
  { name: 'EndEvent', component: EndEvent, defaultLabel: '结束' },
  { name: 'TimerEvent', component: TimerEvent, hasIcon: true },
  { name: 'UserTask', component: UserTask, defaultLabel: '用户任务', hasIcon: true },
  { name: 'ServiceTask', component: ServiceTask, defaultLabel: '服务任务', hasIcon: true },
  { name: 'ScriptTask', component: ScriptTask, defaultLabel: '脚本任务', hasIcon: true },
  { name: 'SendTask', component: SendTask, defaultLabel: '发送任务', hasIcon: true },
  { name: 'ReceiveTask', component: ReceiveTask, defaultLabel: '接收任务', hasIcon: true },
  { name: 'ExclusiveGateway', component: ExclusiveGateway, symbol: 'X' },
  { name: 'ParallelGateway', component: ParallelGateway, symbol: '+' },
  { name: 'InclusiveGateway', component: InclusiveGateway, symbol: '○' },
]

for (const node of nodes) {
  describe(node.name, () => {
    it('mounts without errors', () => {
      const wrapper = mount(node.component, {
        props: { id: '1' },
        global: { stubs },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('renders default content', () => {
      const wrapper = mount(node.component, {
        props: { id: '1' },
        global: { stubs },
      })

      if (node.symbol) {
        expect(wrapper.text()).toContain(node.symbol)
      } else if (node.defaultLabel) {
        expect(wrapper.text()).toContain(node.defaultLabel)
      } else if (node.hasIcon) {
        expect(wrapper.find('svg').exists()).toBe(true)
      }
    })

    it('renders custom label from data.label', () => {
      // TimerEvent has no label element — skip
      if (!node.defaultLabel) return

      const wrapper = mount(node.component, {
        props: { id: '1', data: { label: 'Custom Label' } },
        global: { stubs },
      })
      expect(wrapper.text()).toContain('Custom Label')
    })

    it('applies selected class when selected=true', () => {
      const wrapper = mount(node.component, {
        props: { id: '1', selected: true },
        global: { stubs },
      })
      const selectedCount = wrapper.classes().length

      const wrapperUnselected = mount(node.component, {
        props: { id: '1', selected: false },
        global: { stubs },
      })
      const unselectedCount = wrapperUnselected.classes().length

      expect(selectedCount).toBeGreaterThan(unselectedCount)
      expect(selectedCount).toBe(2)
      expect(unselectedCount).toBe(1)
    })
  })
}
