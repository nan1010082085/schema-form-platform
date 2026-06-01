<template>
  <div :class="styles.palette">
    <div :class="styles.title">流程元素</div>
    <div :class="styles.group">
      <div :class="styles.groupTitle">事件</div>
      <div :class="styles.items">
        <div
          v-for="item in eventItems"
          :key="item.type"
          :class="styles.item"
          data-test="palette-item"
          draggable="true"
          @dragstart="onDragStart($event, item)"
        >
          {{ item.label }}
        </div>
      </div>
    </div>
    <div :class="styles.group">
      <div :class="styles.groupTitle">任务</div>
      <div :class="styles.items">
        <div
          v-for="item in taskItems"
          :key="item.type"
          :class="styles.item"
          data-test="palette-item"
          draggable="true"
          @dragstart="onDragStart($event, item)"
        >
          {{ item.label }}
        </div>
      </div>
    </div>
    <div :class="styles.group">
      <div :class="styles.groupTitle">网关</div>
      <div :class="styles.items">
        <div
          v-for="item in gatewayItems"
          :key="item.type"
          :class="styles.item"
          data-test="palette-item"
          draggable="true"
          @dragstart="onDragStart($event, item)"
        >
          {{ item.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BpmnElementType, DEFAULT_NODE_CONFIGS, DEFAULT_NODE_SIZES } from '@schema-form/flow-shared'
import styles from './FlowPalette.module.scss'

interface PaletteItem {
  type: BpmnElementType
  label: string
  shape: string
}

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

function onDragStart(event: DragEvent, item: PaletteItem) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('application/bpmn-node', JSON.stringify({
    shape: item.shape,
    data: {
      ...DEFAULT_NODE_CONFIGS[item.type],
      bpmnType: item.type,
    },
    ...DEFAULT_NODE_SIZES[item.type],
  }))
}
</script>
