<template>
  <div :class="styles.palette">
    <div :class="styles.title">流程元素</div>
    <div :class="styles.searchWrap">
      <t-input
        v-model="searchQuery"
        size="small"
        placeholder="搜索节点..."
        clearable
        :prefix-icon="SearchIcon"
      />
    </div>
    <div v-if="showWorkflowNodes" :class="styles.group">
      <div :class="styles.groupTitle">触发器</div>
      <div :class="styles.items">
        <div
          v-for="item in filteredWorkflowTriggerItems"
          :key="item.type"
          :class="styles.item"
          data-test="palette-item"
          draggable="true"
          @dragstart="onDragStart($event, item)"
        >
          <span v-html="highlightText(item.label)" />
        </div>
      </div>
    </div>
    <div v-if="showWorkflowNodes" :class="styles.group">
      <div :class="styles.groupTitle">操作</div>
      <div :class="styles.items">
        <div
          v-for="item in filteredWorkflowActionItems"
          :key="item.type"
          :class="styles.item"
          data-test="palette-item"
          draggable="true"
          @dragstart="onDragStart($event, item)"
        >
          <span v-html="highlightText(item.label)" />
        </div>
      </div>
    </div>
    <div v-if="showWorkflowNodes" :class="styles.group">
      <div :class="styles.groupTitle">逻辑</div>
      <div :class="styles.items">
        <div
          v-for="item in filteredWorkflowLogicItems"
          :key="item.type"
          :class="styles.item"
          data-test="palette-item"
          draggable="true"
          @dragstart="onDragStart($event, item)"
        >
          <span v-html="highlightText(item.label)" />
        </div>
      </div>
    </div>
    <div v-if="showBpmnNodes" :class="styles.group">
      <div :class="styles.groupTitle">事件</div>
      <div :class="styles.items">
        <div
          v-for="item in filteredEventItems"
          :key="item.type"
          :class="styles.item"
          data-test="palette-item"
          draggable="true"
          @dragstart="onDragStart($event, item)"
        >
          <span v-html="highlightText(item.label)" />
        </div>
      </div>
    </div>
    <div v-if="showBpmnNodes" :class="styles.group">
      <div :class="styles.groupTitle">任务</div>
      <div :class="styles.items">
        <div
          v-for="item in filteredTaskItems"
          :key="item.type"
          :class="styles.item"
          data-test="palette-item"
          draggable="true"
          @dragstart="onDragStart($event, item)"
        >
          <span v-html="highlightText(item.label)" />
        </div>
      </div>
    </div>
    <div v-if="showBpmnNodes" :class="styles.group">
      <div :class="styles.groupTitle">网关</div>
      <div :class="styles.items">
        <div
          v-for="item in filteredGatewayItems"
          :key="item.type"
          :class="styles.item"
          data-test="palette-item"
          draggable="true"
          @dragstart="onDragStart($event, item)"
        >
          <span v-html="highlightText(item.label)" />
        </div>
      </div>
    </div>
    <div v-if="isAllEmpty" :class="styles.empty">
      未找到匹配的节点
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { SearchIcon } from 'tdesign-icons-vue-next'
import { BpmnElementType, DEFAULT_NODE_CONFIGS, DEFAULT_NODE_SIZES } from '@schema-form/flow-shared'
import { useWorkflowNodes } from '../composables/useWorkflowNodes.js'
import type { WorkflowNodeType } from '../composables/useWorkflowNodes.js'
import styles from './FlowPalette.module.scss'

interface PaletteItem {
  type: BpmnElementType | WorkflowNodeType
  label: string
  shape: string
}

const props = defineProps<{
  mode?: 'bpmn' | 'workflow'
}>()

const { getDefaultData, getNodeSize } = useWorkflowNodes()

const showBpmnNodes = computed(() => props.mode !== 'workflow')
const showWorkflowNodes = computed(() => props.mode === 'workflow')

// Workflow 节点分组
const workflowTriggerItems: PaletteItem[] = [
  { type: 'workflowStart', label: '开始', shape: 'workflow-start' },
  { type: 'workflowEnd', label: '结束', shape: 'workflow-end' },
]

const workflowActionItems: PaletteItem[] = [
  { type: 'workflowEditor', label: '表单配置', shape: 'workflow-editor' },
  { type: 'workflowFlow', label: '子流程', shape: 'workflow-flow' },
  { type: 'workflowAI', label: 'AI 任务', shape: 'workflow-ai' },
]

const workflowLogicItems: PaletteItem[] = [
  { type: 'workflowCondition', label: '条件判断', shape: 'workflow-condition' },
]

// BPMN 节点分组
const eventItems: PaletteItem[] = [
  { type: BpmnElementType.StartEvent, label: '开始事件', shape: 'bpmn-start-event' },
  { type: BpmnElementType.EndEvent, label: '结束事件', shape: 'bpmn-end-event' },
  { type: BpmnElementType.TimerEvent, label: '定时事件', shape: 'bpmn-timer-event' },
]

const taskItems: PaletteItem[] = [
  { type: BpmnElementType.UserTask, label: '用户任务', shape: 'bpmn-user-task' },
  { type: BpmnElementType.ServiceTask, label: '服务任务', shape: 'bpmn-service-task' },
  { type: BpmnElementType.ScriptTask, label: '脚本任务', shape: 'bpmn-script-task' },
  { type: BpmnElementType.SendTask, label: '发送任务', shape: 'bpmn-send-task' },
  { type: BpmnElementType.ReceiveTask, label: '接收任务', shape: 'bpmn-receive-task' },
  { type: BpmnElementType.SubProcess, label: '子流程', shape: 'bpmn-sub-process' },
]

const gatewayItems: PaletteItem[] = [
  { type: BpmnElementType.ExclusiveGateway, label: '排他网关', shape: 'bpmn-exclusive-gateway' },
  { type: BpmnElementType.ParallelGateway, label: '并行网关', shape: 'bpmn-parallel-gateway' },
  { type: BpmnElementType.InclusiveGateway, label: '包含网关', shape: 'bpmn-inclusive-gateway' },
]

const searchQuery = ref('')

function matchItem(item: PaletteItem, q: string): boolean {
  return item.label.toLowerCase().includes(q)
}

function filterItems(items: PaletteItem[]): PaletteItem[] {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return items
  return items.filter(item => matchItem(item, q))
}

const filteredWorkflowTriggerItems = computed(() => filterItems(workflowTriggerItems))
const filteredWorkflowActionItems = computed(() => filterItems(workflowActionItems))
const filteredWorkflowLogicItems = computed(() => filterItems(workflowLogicItems))
const filteredEventItems = computed(() => filterItems(eventItems))
const filteredTaskItems = computed(() => filterItems(taskItems))
const filteredGatewayItems = computed(() => filterItems(gatewayItems))

const isAllEmpty = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return false
  if (props.mode === 'workflow') {
    return filteredWorkflowTriggerItems.value.length === 0
      && filteredWorkflowActionItems.value.length === 0
      && filteredWorkflowLogicItems.value.length === 0
  }
  return filteredEventItems.value.length === 0
    && filteredTaskItems.value.length === 0
    && filteredGatewayItems.value.length === 0
})

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function highlightText(text: string): string {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return escapeHtml(text)
  const idx = text.toLowerCase().indexOf(q)
  if (idx === -1) return escapeHtml(text)
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + q.length)
  const after = text.slice(idx + q.length)
  return `${escapeHtml(before)}<em class="${styles.highlight}">${escapeHtml(match)}</em>${escapeHtml(after)}`
}

function onDragStart(event: DragEvent, item: PaletteItem) {
  if (!event.dataTransfer) return

  // Workflow 节点使用不同的数据格式
  if (item.shape.startsWith('workflow-')) {
    const workflowType = item.type as WorkflowNodeType
    event.dataTransfer.setData('application/bpmn-node', JSON.stringify({
      shape: item.shape,
      data: getDefaultData(workflowType),
      ...getNodeSize(workflowType),
    }))
  } else {
    // BPMN 节点
    event.dataTransfer.setData('application/bpmn-node', JSON.stringify({
      shape: item.shape,
      data: {
        ...DEFAULT_NODE_CONFIGS[item.type as BpmnElementType],
        bpmnType: item.type,
      },
      ...DEFAULT_NODE_SIZES[item.type as BpmnElementType],
    }))
  }
}
</script>
