<template>
  <div :class="$style.container">
    <!-- 基本信息 -->
    <SectionToggle title="基本信息" :count="2">
      <FieldRow label="节点名称">
        <el-input
          :model-value="label"
          placeholder="输入节点名称"
          @input="update('label', $event)"
        />
      </FieldRow>
      <FieldRow label="节点描述">
        <el-input
          :model-value="description"
          type="textarea"
          :rows="2"
          placeholder="节点描述（可选）"
          @input="update('description', $event)"
        />
      </FieldRow>
    </SectionToggle>

    <!-- Schema 绑定 -->
    <SectionToggle title="表单绑定" :count="schemaBindingCount">
      <SchemaBindingPanel
        :form-schema-id="formSchemaId"
        :form-publish-id="formPublishId"
        :form-mode="formMode"
        :schema-name="schemaName"
        @update="update"
      />
    </SectionToggle>

    <!-- 审批人配置 -->
    <SectionToggle title="审批人配置" :count="assigneeCount">
      <FieldRow label="审批类型">
        <el-select
          :model-value="approvalMode"
          @change="update('approvalMode', $event)"
        >
          <el-option label="单一审批" value="single" />
          <el-option label="会签（所有人审批）" value="countersign" />
          <el-option label="或签（一人审批即可）" value="or-sign" />
        </el-select>
      </FieldRow>

      <FieldRow label="审批人类型">
        <el-select
          :model-value="assigneeType"
          @change="update('assigneeType', $event)"
        >
          <el-option label="指定用户" value="user" />
          <el-option label="指定角色" value="role" />
          <el-option label="上级用户" value="superior" />
          <el-option label="部门经理" value="manager" />
        </el-select>
      </FieldRow>

      <FieldRow v-if="assigneeType === 'user'" label="审批人">
        <UserPicker
          :model-value="assignee"
          @change="update('assignee', $event)"
        />
      </FieldRow>

      <FieldRow v-if="assigneeType === 'role'" label="审批角色">
        <RolePicker
          :model-value="assigneeRole"
          @change="update('assigneeRole', $event)"
        />
      </FieldRow>
    </SectionToggle>

    <!-- 审批记录 -->
    <SectionToggle v-if="instanceId" title="审批记录" :count="0">
      <ApprovalList :instance-id="instanceId" />
    </SectionToggle>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from '@/components/nodePanels/SectionToggle.vue'
import FieldRow from '@/components/nodePanels/FieldRow.vue'
import SchemaBindingPanel from '@/components/SchemaBindingPanel.vue'
import ApprovalList from '@/components/ApprovalList.vue'
import UserPicker from '@/components/UserPicker.vue'
import RolePicker from '@/components/RolePicker.vue'

const props = defineProps<{
  node: Node
  instanceId?: string
}>()

const emit = defineEmits<{
  updateNodeData: [key: string, value: unknown]
}>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const label = computed(() => (props.node.data?.label as string) ?? '')
const description = computed(() => (props.node.data?.description as string) ?? '')
const formSchemaId = computed(() => (props.node.data?.formSchemaId as string) ?? '')
const formPublishId = computed(() => (props.node.data?.formPublishId as string) ?? '')
const formMode = computed(() => (props.node.data?.formMode as string) ?? 'view')
const schemaName = computed(() => (props.node.data?.schemaName as string) ?? '')
const approvalMode = computed(() => (props.node.data?.approvalMode as string) ?? 'single')
const assigneeType = computed(() => (props.node.data?.assigneeType as string) ?? 'user')
const assignee = computed(() => (props.node.data?.assignee as string) ?? '')
const assigneeRole = computed(() => (props.node.data?.assigneeRole as string) ?? '')

const schemaBindingCount = computed(() => {
  let count = 0
  if (formSchemaId.value) count++
  if (formMode.value) count++
  return count
})

const assigneeCount = computed(() => {
  let count = 0
  if (approvalMode.value) count++
  if (assigneeType.value) count++
  if (assignee.value || assigneeRole.value) count++
  return count
})
</script>

<style module>
.container {
  padding: 16px;
}
</style>
