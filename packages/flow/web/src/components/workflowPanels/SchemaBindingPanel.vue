<template>
  <div :class="$style.container">
    <SectionToggle title="Schema 绑定" :count="bindingCount">
      <!-- Schema 选择 -->
      <FieldRow label="绑定表单">
        <div :class="$style.schemaSelector">
          <t-input
            :value="schemaName"
            placeholder="点击选择表单"
            readonly
            @click="showSchemaSelector = true"
          >
            <template #append>
              <t-button @click="showSchemaSelector = true">选择</t-button>
            </template>
          </t-input>
        </div>
      </FieldRow>

      <FieldRow v-if="formSchemaId" label="表单模式">
        <t-select
          :value="formMode"
          @change="update('formMode', $event)"
        >
          <t-option label="新建（create）" value="create" />
          <t-option label="查看（view）" value="view" />
          <t-option label="编辑（edit）" value="edit" />
          <t-option label="审批（approve）" value="approve" />
        </t-select>
      </FieldRow>

      <HintText v-if="formSchemaId">
        表单模式决定了运行时表单的行为：
        <br/>• create - 新建数据，所有字段可编辑
        <br/>• view - 只读查看
        <br/>• edit - 编辑已有数据
        <br/>• approve - 审批模式，可配置部分字段可编辑
      </HintText>

      <!-- 按钮事件说明 -->
      <div v-if="formSchemaId" :class="$style.eventInfo">
        <div :class="$style.eventTitle">按钮事件绑定</div>
        <div :class="$style.eventDesc">
          表单中的按钮事件已在 Editor 中配置。
          <br/>支持的流程动作：
          <br/>• <code>startFlow</code> - 发起流程
          <br/>• <code>completeTask</code> - 完成任务
          <br/>• <code>approveTask</code> - 审批通过
          <br/>• <code>rejectTask</code> - 审批拒绝
          <br/>• <code>claimTask</code> - 认领任务
        </div>
      </div>
    </SectionToggle>

    <!-- Schema 选择弹窗 -->
    <t-dialog
      v-model:visible="showSchemaSelector"
      header="选择表单"
      width="800px"
      destroy-on-close
    >
      <SchemaList
        :selected-id="formSchemaId"
        @select="handleSchemaSelect"
      />
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from '@/components/nodePanels/SectionToggle.vue'
import FieldRow from '@/components/nodePanels/FieldRow.vue'
import HintText from '@/components/nodePanels/HintText.vue'
import SchemaList from './SchemaList.vue'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

const showSchemaSelector = ref(false)

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const formSchemaId = computed(() => (props.node.data?.formSchemaId as string) ?? '')
const formPublishId = computed(() => (props.node.data?.formPublishId as string) ?? '')
const formMode = computed(() => (props.node.data?.formMode as string) ?? 'view')
const schemaName = computed(() => (props.node.data?.schemaName as string) ?? formSchemaId.value)

const bindingCount = computed(() => {
  let count = 0
  if (formSchemaId.value) count++
  if (formMode.value) count++
  return count
})

function handleSchemaSelect(schema: { id: string; name: string; publishId?: string }) {
  update('formSchemaId', schema.id)
  update('schemaName', schema.name)
  if (schema.publishId) {
    update('formPublishId', schema.publishId)
  }
  showSchemaSelector.value = false
}
</script>

<style module>
.container {
  padding: 16px;
}

.schemaSelector {
  width: 100%;
}

.eventInfo {
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
}

.eventTitle {
  font-weight: 500;
  color: var(--text-color-primary);
  margin-bottom: 8px;
}

.eventDesc {
  font-size: 12px;
  color: var(--text-color-secondary);
  line-height: 1.8;
}

.eventDesc code {
  background: var(--color-primary-light);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--color-primary);
}
</style>
