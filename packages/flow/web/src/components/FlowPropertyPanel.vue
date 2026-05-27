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
        <!-- Assignee -->
        <div :class="$style.section">
          <label :class="$style.label">审批人</label>
          <input
            :class="$style.input"
            :value="selectedNode.data?.assignee ?? ''"
            @input="updateNodeData('assignee', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div :class="$style.divider" />

        <!-- Approval mode -->
        <div :class="$style.section">
          <label :class="$style.label">审批模式</label>
          <div :class="$style.radioGroup">
            <label :class="$style.radioLabel">
              <input
                type="radio"
                name="approval-mode"
                value="single"
                :checked="(selectedNode.data?.approvalMode ?? 'single') === 'single'"
                @change="updateNodeData('approvalMode', 'single')"
              />
              单人审批
            </label>
            <label :class="$style.radioLabel">
              <input
                type="radio"
                name="approval-mode"
                value="countersign"
                :checked="selectedNode.data?.approvalMode === 'countersign'"
                @change="updateNodeData('approvalMode', 'countersign')"
              />
              会签（全部通过）
            </label>
            <label :class="$style.radioLabel">
              <input
                type="radio"
                name="approval-mode"
                value="or-sign"
                :checked="selectedNode.data?.approvalMode === 'or-sign'"
                @change="updateNodeData('approvalMode', 'or-sign')"
              />
              或签（任一通过）
            </label>
          </div>
        </div>

        <!-- Countersign: min approval count -->
        <template v-if="selectedNode.data?.approvalMode === 'countersign'">
          <div :class="$style.section">
            <label :class="$style.label">最少通过人数</label>
            <input
              :class="$style.input"
              type="number"
              min="1"
              :value="selectedNode.data?.minApprovalCount ?? ''"
              placeholder="默认全部通过"
              @input="updateNodeData('minApprovalCount', toNumberOrNull(($event.target as HTMLInputElement).value))"
            />
          </div>
        </template>

        <!-- Countersign / or-sign: assignee collection -->
        <template v-if="selectedNode.data?.approvalMode === 'countersign' || selectedNode.data?.approvalMode === 'or-sign'">
          <div :class="$style.section">
            <label :class="$style.label">审批人集合变量</label>
            <input
              :class="$style.input"
              :value="selectedNode.data?.assigneeCollection ?? ''"
              placeholder="例: approvers"
              @input="updateNodeData('assigneeCollection', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div :class="$style.hint">
            从流程变量中读取该名称对应的数组，为每个元素创建一个审批任务。
          </div>
        </template>

        <div :class="$style.divider" />

        <!-- Form association -->
        <div :class="$style.section">
          <label :class="$style.checkboxLabel">
            <input
              type="checkbox"
              :checked="!!selectedNode.data?.formSchemaId"
              @change="toggleForm"
            />
            关联表单
          </label>
        </div>

        <template v-if="selectedNode.data?.formSchemaId">
          <div :class="$style.section">
            <label :class="$style.label">表单 Schema ID</label>
            <input
              :class="$style.input"
              :value="selectedNode.data?.formSchemaId ?? ''"
              placeholder="表单 Schema ID"
              @input="updateNodeData('formSchemaId', ($event.target as HTMLInputElement).value)"
            />
          </div>

          <div :class="$style.section">
            <label :class="$style.label">填充模式</label>
            <div :class="$style.radioGroup">
              <label :class="$style.radioLabel">
                <input
                  type="radio"
                  name="form-mode"
                  value="create"
                  :checked="(selectedNode.data?.formMode ?? 'create') === 'create'"
                  @change="updateNodeData('formMode', 'create')"
                />
                新建
              </label>
              <label :class="$style.radioLabel">
                <input
                  type="radio"
                  name="form-mode"
                  value="prefill"
                  :checked="selectedNode.data?.formMode === 'prefill'"
                  @change="updateNodeData('formMode', 'prefill')"
                />
                预填
              </label>
              <label :class="$style.radioLabel">
                <input
                  type="radio"
                  name="form-mode"
                  value="readonly"
                  :checked="selectedNode.data?.formMode === 'readonly'"
                  @change="updateNodeData('formMode', 'readonly')"
                />
                只读
              </label>
            </div>
          </div>

          <div :class="$style.section">
            <label :class="$style.label">数据写入变量</label>
            <input
              :class="$style.input"
              :value="selectedNode.data?.formVariable ?? ''"
              placeholder="例: formData"
              @input="updateNodeData('formVariable', ($event.target as HTMLInputElement).value)"
            />
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

function toggleForm() {
  if (!selectedNode.value) return
  if (selectedNode.value.data?.formSchemaId) {
    const { formSchemaId: _, formMode: _m, formVariable: _v, ...rest } = selectedNode.value.data
    selectedNode.value.data = rest
  } else {
    selectedNode.value.data = {
      ...selectedNode.value.data,
      formSchemaId: '',
      formMode: 'create',
      formVariable: '',
    }
  }
}

function toNumberOrNull(val: string): number | null {
  if (!val) return null
  const n = Number(val)
  return Number.isFinite(n) ? n : null
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
