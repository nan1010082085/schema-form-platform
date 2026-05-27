<template>
  <div class="flow-palette">
    <div class="flow-palette__title">流程元素</div>
    <div class="flow-palette__group">
      <div class="flow-palette__group-title">事件</div>
      <div class="flow-palette__items">
        <div
          v-for="item in eventItems"
          :key="item.type"
          class="flow-palette__item"
          draggable="true"
          @dragstart="onDragStart($event, item)"
        >
          {{ item.label }}
        </div>
      </div>
    </div>
    <div class="flow-palette__group">
      <div class="flow-palette__group-title">任务</div>
      <div class="flow-palette__items">
        <div
          v-for="item in taskItems"
          :key="item.type"
          class="flow-palette__item"
          draggable="true"
          @dragstart="onDragStart($event, item)"
        >
          {{ item.label }}
        </div>
      </div>
    </div>
    <div class="flow-palette__group">
      <div class="flow-palette__group-title">网关</div>
      <div class="flow-palette__items">
        <div
          v-for="item in gatewayItems"
          :key="item.type"
          class="flow-palette__item"
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

<style module>
.flow-palette {
  width: 200px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
  padding: 12px;
}

.flow-palette__title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
}

.flow-palette__group {
  margin-bottom: 16px;
}

.flow-palette__group-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.flow-palette__items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.flow-palette__item {
  padding: 8px 12px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  font-size: 13px;
  cursor: grab;
  user-select: none;
  transition: border-color 0.2s;
}

.flow-palette__item:hover {
  border-color: #409eff;
  color: #409eff;
}
</style>
