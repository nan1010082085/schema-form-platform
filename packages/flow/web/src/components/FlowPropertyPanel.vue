<template>
  <div :class="$style.panel">
    <div v-if="selectedNode" :class="$style.content">
      <div :class="$style.title">节点属性</div>

      <div :class="$style.section">
        <label :class="$style.label">节点名称</label>
        <input
          :class="$style.input"
          :value="selectedNode.data?.label ?? ''"
          @input="updateNodeData('label', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <template v-if="selectedNode.type === 'user-task'">
        <div :class="$style.section">
          <label :class="$style.label">审批人</label>
          <input
            :class="$style.input"
            :value="selectedNode.data?.assignee ?? ''"
            @input="updateNodeData('assignee', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div :class="$style.divider" />

        <div :class="$style.section">
          <label :class="$style.checkboxLabel">
            <input
              type="checkbox"
              :checked="!!selectedNode.data?.multiInstance"
              @change="toggleMultiInstance"
            />
            多实例任务
          </label>
        </div>

        <template v-if="selectedNode.data?.multiInstance">
          <div :class="$style.section">
            <label :class="$style.label">类型</label>
            <div :class="$style.radioGroup">
              <label :class="$style.radioLabel">
                <input
                  type="radio"
                  name="mi-type"
                  value="parallel"
                  :checked="selectedNode.data.multiInstance.type === 'parallel'"
                  @change="updateMultiInstance('type', 'parallel')"
                />
                并行（会签）
              </label>
              <label :class="$style.radioLabel">
                <input
                  type="radio"
                  name="mi-type"
                  value="sequential"
                  :checked="selectedNode.data.multiInstance.type === 'sequential'"
                  @change="updateMultiInstance('type', 'sequential')"
                />
                串行（或签）
              </label>
            </div>
          </div>

          <div :class="$style.section">
            <label :class="$style.label">集合变量名</label>
            <input
              :class="$style.input"
              :value="selectedNode.data.multiInstance.collection"
              placeholder="例: approvers"
              @input="updateMultiInstance('collection', ($event.target as HTMLInputElement).value)"
            />
          </div>

          <div :class="$style.hint">
            从流程变量中读取该名称对应的数组，为每个元素创建一个任务实例。
          </div>
        </template>
      </template>
    </div>

    <div v-else-if="selectedEdgeId" :class="$style.content">
      <div :class="$style.title">连线属性</div>
      <p :class="$style.placeholder">连线配置面板将在 Phase 3 实现</p>
    </div>

    <div v-else :class="$style.empty">
      <p>请选择节点或连线</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { useFlowDesignerStore } from '../stores/flowDesigner.js'
import { storeToRefs } from 'pinia'
import type { MultiInstanceConfig } from '@schema-form/flow-shared'

const { findNode } = useVueFlow()
const { selectedNodeId, selectedEdgeId } = storeToRefs(useFlowDesignerStore())

const selectedNode = computed(() => {
  if (!selectedNodeId.value) return null
  return findNode(selectedNodeId.value)
})

function updateNodeData(key: string, value: unknown) {
  if (!selectedNode.value) return
  selectedNode.value.data = { ...selectedNode.value.data, [key]: value }
}

function toggleMultiInstance() {
  if (!selectedNode.value) return
  if (selectedNode.value.data?.multiInstance) {
    const { multiInstance: _, ...rest } = selectedNode.value.data
    selectedNode.value.data = rest
  } else {
    const config: MultiInstanceConfig = { type: 'parallel', collection: '' }
    selectedNode.value.data = { ...selectedNode.value.data, multiInstance: config }
  }
}

function updateMultiInstance(key: keyof MultiInstanceConfig, value: string) {
  if (!selectedNode.value?.data?.multiInstance) return
  selectedNode.value.data = {
    ...selectedNode.value.data,
    multiInstance: { ...selectedNode.value.data.multiInstance, [key]: value },
  }
}
</script>

<style module>
.panel {
  width: 280px;
  background: #fff;
  border-left: 1px solid #e4e7ed;
  overflow-y: auto;
}

.content {
  padding: 16px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
}

.section {
  margin-bottom: 12px;
}

.label {
  display: block;
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
}

.input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  color: #303133;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: #409eff;
}

.checkboxLabel {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #303133;
  cursor: pointer;
}

.radioGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.radioLabel {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #303133;
  cursor: pointer;
}

.divider {
  height: 1px;
  background: #ebeef5;
  margin: 12px 0;
}

.hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin-top: 4px;
}

.placeholder {
  color: #909399;
  font-size: 13px;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #c0c4cc;
  font-size: 14px;
}
</style>
