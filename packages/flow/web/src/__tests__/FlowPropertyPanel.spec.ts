import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

/* ------------------------------------------------------------------ */
/*  Mocks — element-plus                                               */
/* ------------------------------------------------------------------ */

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@element-plus/icons-vue', () => ({
  ArrowRight: { template: '<span />' },
  ArrowDown: { template: '<span />' },
  CopyDocument: { template: '<span />' },
}))

/* ------------------------------------------------------------------ */
/*  Mocks — flowGraphStore                                             */
/* ------------------------------------------------------------------ */

const mockNodes = [
  {
    id: 'node-1',
    type: 'user-task',
    data: {
      label: '审批',
      assigneeType: 'user',
      candidateUsers: ['u1'],
      approvalMode: 'single',
      rejectPolicy: 'follow-global',
    },
  },
  {
    id: 'timer-1',
    type: 'timer-event',
    data: {
      label: '定时器',
      timerType: 'duration',
      timerValue: 'PT2H',
    },
  },
  {
    id: 'gw-1',
    type: 'exclusive-gateway',
    data: {
      label: '排他网关',
      defaultFlow: '',
    },
  },
  {
    id: 'pgw-1',
    type: 'parallel-gateway',
    data: {
      label: '并行网关',
      defaultFlow: '',
    },
  },
  {
    id: 'igw-1',
    type: 'inclusive-gateway',
    data: {
      label: '包含网关',
      defaultFlow: '',
    },
  },
  {
    id: 'svc-1',
    type: 'service-task',
    data: {
      label: 'HTTP调用',
      serviceType: 'http',
      serviceConfig: '',
    },
  },
  {
    id: 'script-1',
    type: 'script-task',
    data: {
      label: '脚本',
      scriptLanguage: 'javascript',
      scriptContent: '',
    },
  },
]

const mockEdges = [
  {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    label: '通过',
    data: { conditionExpression: '${approved}', isDefault: false },
  },
  {
    id: 'gw-edge-1',
    source: 'gw-1',
    target: 'node-2',
    label: '金额大于1万',
    data: { conditionExpression: '${amount > 10000}', isDefault: false },
  },
  {
    id: 'gw-edge-2',
    source: 'gw-1',
    target: 'node-3',
    label: '',
    data: { conditionExpression: '', isDefault: true },
  },
  {
    id: 'pgw-edge-1',
    source: 'pgw-1',
    target: 'node-2',
    label: '分支A',
    data: { conditionExpression: '', isDefault: false },
  },
  {
    id: 'pgw-edge-2',
    source: 'pgw-1',
    target: 'node-3',
    label: '分支B',
    data: { conditionExpression: '', isDefault: false },
  },
]

vi.mock('../stores/flowGraph.js', () => ({
  useFlowGraphStore: () => ({
    nodes: mockNodes,
    edges: mockEdges,
    findNode: (id: string) => mockNodes.find(n => n.id === id) ?? undefined,
    updateNodeData: vi.fn(),
    setNodeData: vi.fn(),
    updateEdgeData: vi.fn(),
    setEdgeData: vi.fn(),
  }),
}))

vi.mock('../stores/flowGraph.ts', () => ({
  useFlowGraphStore: () => ({
    nodes: mockNodes,
    edges: mockEdges,
    findNode: (id: string) => mockNodes.find(n => n.id === id) ?? undefined,
    updateNodeData: vi.fn(),
    setNodeData: vi.fn(),
    updateEdgeData: vi.fn(),
    setEdgeData: vi.fn(),
  }),
}))

/* ------------------------------------------------------------------ */
/*  Mocks — store                                                      */
/* ------------------------------------------------------------------ */

let mockSelectedNodeId = ref<string | null>(null)
let mockSelectedEdgeId = ref<string | null>(null)

vi.mock('../stores/flowDesigner.js', () => ({
  useFlowDesignerStore: () => ({
    selectedNodeId: mockSelectedNodeId,
    selectedEdgeId: mockSelectedEdgeId,
  }),
}))

vi.mock('../stores/flowDesigner.ts', () => ({
  useFlowDesignerStore: () => ({
    selectedNodeId: mockSelectedNodeId,
    selectedEdgeId: mockSelectedEdgeId,
  }),
}))

/* ------------------------------------------------------------------ */
/*  Mocks — UserPicker                                                 */
/* ------------------------------------------------------------------ */

vi.mock('../components/UserPicker.vue', () => ({
  default: {
    template: '<div data-testid="user-picker" />',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
  },
}))

/* ------------------------------------------------------------------ */
/*  Import AFTER mocks                                                 */
/* ------------------------------------------------------------------ */

import FlowPropertyPanel from '../components/FlowPropertyPanel.vue'

/* ------------------------------------------------------------------ */
/*  Element Plus stubs                                                 */
/* ------------------------------------------------------------------ */

const elStubs = {
  'el-input': {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'type', 'size', 'rows'],
    emits: ['update:modelValue', 'input'],
  },
  'el-input-number': {
    template: '<input type="number" :value="modelValue" />',
    props: ['modelValue', 'min', 'size', 'controlsPosition'],
    emits: ['change'],
  },
  'el-radio-group': {
    template: '<div><slot /></div>',
    props: ['modelValue', 'size'],
    emits: ['change'],
  },
  'el-radio': {
    template: '<label><input type="radio" :value="value" /> <slot /></label>',
    props: ['value'],
  },
  'el-select': {
    template: '<select :value="modelValue"><slot /></select>',
    props: ['modelValue', 'multiple', 'filterable', 'allowCreate', 'placeholder'],
    emits: ['change'],
  },
  'el-option': {
    template: '<option :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  'el-checkbox': {
    template: '<label><input type="checkbox" :checked="modelValue" @change="$emit(\'change\', $event.target.checked)" /> <slot /></label>',
    props: ['modelValue'],
    emits: ['change'],
  },
  'el-checkbox-group': {
    template: '<div><slot /></div>',
    props: ['modelValue'],
    emits: ['change'],
  },
  'el-scrollbar': {
    template: '<div><slot /></div>',
  },
  'el-switch': {
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'change\', $event.target.checked)" />',
    props: ['modelValue'],
    emits: ['change'],
  },
  'el-tooltip': {
    template: '<span><slot /></span>',
    props: ['content', 'placement', 'showAfter'],
  },
  'el-icon': {
    template: '<span><slot /></span>',
    props: ['size'],
  },
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('FlowPropertyPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    mockSelectedNodeId.value = null
    mockSelectedEdgeId.value = null
  })

  function mountPanel() {
    return mount(FlowPropertyPanel, {
      global: { stubs: elStubs },
    })
  }

  describe('empty state', () => {
    it('shows placeholder when nothing is selected', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('请选择节点或连线')
    })

    it('does not show node type when nothing is selected', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).not.toContain('用户任务')
    })
  })

  describe('node selection', () => {
    beforeEach(() => {
      mockSelectedNodeId.value = 'node-1'
      mockSelectedEdgeId.value = null
    })

    it('shows node type display name when node is selected', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('用户任务')
    })

    it('shows node label input with correct value', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('节点名称')
      const input = wrapper.find('input')
      expect(input.exists()).toBe(true)
    })

    it('shows user-task specific fields when type is user-task', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('指派方式')
      expect(wrapper.text()).toContain('审批模式')
      expect(wrapper.text()).toContain('驳回策略')
    })

    it('shows assignee type radio options', () => {
      const wrapper = mountPanel()
      const radios = wrapper.findAll('input[type="radio"]')
      const labels = radios.map(r => (r.element as HTMLInputElement).value)
      expect(labels).toContain('user')
      expect(labels).toContain('role')
      expect(labels).toContain('expression')
    })

    it('shows UserPicker when assigneeType is user', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="user-picker"]').exists()).toBe(true)
    })

    it('shows approval mode options', () => {
      const wrapper = mountPanel()
      const text = wrapper.text()
      expect(text).toContain('单人审批')
      expect(text).toContain('会签')
      expect(text).toContain('或签')
    })

    it('shows reject policy options', () => {
      const wrapper = mountPanel()
      const text = wrapper.text()
      expect(text).toContain('跟随流程')
      expect(text).toContain('全部驳回才驳回')
      expect(text).toContain('一票驳回即驳回')
    })

    it('shows form association checkbox', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('关联表单')
    })
  })

  describe('timer-event node', () => {
    beforeEach(() => {
      mockSelectedNodeId.value = 'timer-1'
      mockSelectedEdgeId.value = null
    })

    it('shows timer type options', () => {
      const wrapper = mountPanel()
      const text = wrapper.text()
      expect(text).toContain('定时类型')
      expect(text).toContain('持续时间')
      expect(text).toContain('指定日期')
      expect(text).toContain('循环')
    })

    it('shows timer value input', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('定时值')
    })
  })

  describe('exclusive-gateway node', () => {
    beforeEach(() => {
      mockSelectedNodeId.value = 'gw-1'
      mockSelectedEdgeId.value = null
    })

    it('shows gateway config section with default flow field', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('网关配置')
      expect(wrapper.text()).toContain('默认连线')
    })

    it('shows gateway description field', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('网关描述')
    })

    it('shows outgoing edge conditions section', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('出线条件')
    })

    it('shows condition expression for each outgoing edge', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('条件表达式')
      expect(wrapper.text()).toContain('条件标签')
    })

    it('shows target labels for outgoing edges', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('默认')
    })

    it('shows exclusive gateway hint text', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('排他网关')
    })
  })

  describe('parallel-gateway node', () => {
    beforeEach(() => {
      mockSelectedNodeId.value = 'pgw-1'
      mockSelectedEdgeId.value = null
    })

    it('shows gateway config section', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('网关配置')
      expect(wrapper.text()).toContain('默认连线')
    })

    it('shows outgoing edge conditions section', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('出线条件')
    })

    it('shows parallel gateway hint text', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('并行网关')
      expect(wrapper.text()).toContain('同时执行')
    })

    it('shows edge labels for outgoing branches', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('条件标签')
    })
  })

  describe('inclusive-gateway node', () => {
    beforeEach(() => {
      mockSelectedNodeId.value = 'igw-1'
      mockSelectedEdgeId.value = null
    })

    it('shows gateway config section', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('网关配置')
    })

    it('shows inclusive gateway hint text', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('包含网关')
    })
  })

  describe('service-task node', () => {
    beforeEach(() => {
      mockSelectedNodeId.value = 'svc-1'
      mockSelectedEdgeId.value = null
    })

    it('shows service type and config', () => {
      const wrapper = mountPanel()
      const text = wrapper.text()
      expect(text).toContain('服务类型')
      expect(text).toContain('请求配置')
      expect(text).toContain('HTTP')
      expect(text).toContain('消息队列')
    })
  })

  describe('script-task node', () => {
    beforeEach(() => {
      mockSelectedNodeId.value = 'script-1'
      mockSelectedEdgeId.value = null
    })

    it('shows script language and content', () => {
      const wrapper = mountPanel()
      const text = wrapper.text()
      expect(text).toContain('脚本语言')
      expect(text).toContain('JavaScript')
      expect(text).toContain('脚本内容')
    })
  })

  describe('edge selection', () => {
    beforeEach(() => {
      mockSelectedNodeId.value = null
      mockSelectedEdgeId.value = 'edge-1'
    })

    it('shows edge type display name', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('连线')
    })

    it('shows edge label input', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('连线标签')
    })

    it('shows condition expression input', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('条件表达式')
    })

    it('shows isDefault checkbox', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('默认连线')
    })
  })
})
