<template>
  <div :class="$style.container">
    <SectionToggle title="按钮事件绑定" :count="bindings.length">
      <div :class="$style.bindingList">
        <div
          v-for="(binding, index) in bindings"
          :key="index"
          :class="$style.bindingItem"
        >
          <div :class="$style.bindingHeader">
            <span :class="$style.bindingName">{{ binding.buttonField }}</span>
            <t-button
              theme="danger"
              variant="text"
              size="small"
              @click="removeBinding(index)"
            >
              删除
            </t-button>
          </div>

          <FieldRow label="流程动作">
            <t-select
              :value="binding.action"
              @change="updateBinding(index, 'action', $event)"
            >
              <t-option label="提交" value="submit" />
              <t-option label="审批通过" value="approve" />
              <t-option label="审批拒绝" value="reject" />
              <t-option label="下一步" value="next" />
              <t-option label="终止" value="terminate" />
            </t-select>
          </FieldRow>

          <FieldRow v-if="binding.action === 'next'" label="目标节点">
            <t-select
              :value="binding.targetNodeId"
              placeholder="选择目标节点"
              @change="updateBinding(index, 'targetNodeId', $event)"
            >
              <t-option
                v-for="node in availableNodes"
                :key="node.id"
                :label="node.data?.label || node.id"
                :value="node.id"
              />
            </t-select>
          </FieldRow>

          <FieldRow label="确认提示">
            <t-input
              :value="binding.confirmMessage"
              placeholder="操作前的确认提示（可选）"
              @input="updateBinding(index, 'confirmMessage', $event)"
            />
          </FieldRow>
        </div>

        <t-button :class="$style.addBtn" @click="addBinding">
          + 添加按钮绑定
        </t-button>
      </div>
    </SectionToggle>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from '@/components/nodePanels/SectionToggle.vue'
import FieldRow from '@/components/nodePanels/FieldRow.vue'

interface ButtonBinding {
  buttonField: string
  action: 'submit' | 'approve' | 'reject' | 'next' | 'terminate'
  targetNodeId?: string
  updateFields?: Record<string, unknown>
  confirmMessage?: string
}

const props = defineProps<{
  node: Node
  allNodes: Node[]
}>()

const emit = defineEmits<{
  updateNodeData: [key: string, value: unknown]
}>()

const bindings = computed(() => {
  const buttonEvents = props.node.data?.buttonEvents as Record<string, ButtonBinding> | undefined
  if (!buttonEvents) return []
  return Object.entries(buttonEvents).map(([buttonField, binding]) => ({
    buttonField: buttonField,
    ...binding,
  }))
})

const availableNodes = computed(() => {
  return props.allNodes.filter(n => n.id !== props.node.id)
})

function addBinding() {
  const buttonEvents = { ...(props.node.data?.buttonEvents || {}) }
  const fieldName = `button_${Date.now()}`
  buttonEvents[fieldName] = {
    action: 'submit',
  }
  emit('updateNodeData', 'buttonEvents', buttonEvents)
}

function removeBinding(index: number) {
  const buttonEvents = { ...(props.node.data?.buttonEvents || {}) }
  const keys = Object.keys(buttonEvents)
  if (keys[index]) {
    delete buttonEvents[keys[index]]
    emit('updateNodeData', 'buttonEvents', buttonEvents)
  }
}

function updateBinding(index: number, key: string, value: unknown) {
  const buttonEvents = { ...(props.node.data?.buttonEvents || {}) }
  const keys = Object.keys(buttonEvents)
  const fieldKey = keys[index]
  if (fieldKey) {
    buttonEvents[fieldKey] = { ...buttonEvents[fieldKey], [key]: value }
    emit('updateNodeData', 'buttonEvents', buttonEvents)
  }
}
</script>

<style module>
.container {
  padding: 16px;
}

.bindingList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bindingItem {
  background: var(--bg-color-secondary);
  border-radius: 8px;
  padding: 12px;
}

.bindingHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.bindingName {
  font-weight: 500;
  color: var(--text-color-primary);
}

.addBtn {
  width: 100%;
  margin-top: 8px;
}
</style>
