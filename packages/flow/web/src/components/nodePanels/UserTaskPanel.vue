<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'
import UserPicker from '../UserPicker.vue'
import { flowApi } from '../../api/flowApi'
import styles from './UserTaskPanel.module.scss'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

/* --- Assignee --- */

const assigneeType = computed(() => (props.node.data?.assigneeType as string) ?? 'user')

/* --- Approval mode --- */

const approvalMode = computed(() => (props.node.data?.approvalMode as string) ?? 'single')

/* --- Reject policy --- */

const rejectPolicy = computed(() => (props.node.data?.rejectPolicy as string) ?? 'follow-global')

/* --- Published forms --- */

interface PublishedForm {
  id: string
  name: string
  publishId: string
}

const publishedForms = ref<PublishedForm[]>([])

onMounted(async () => {
  try {
    const data = await flowApi.getPublishedForms()
    publishedForms.value = data as PublishedForm[]
  } catch {
    // ignore -- dropdown stays empty
  }
})

function onFormSelect(publishId: string) {
  const form = publishedForms.value.find((f) => f.publishId === publishId)
  update('formSchemaId', form?.id ?? '')
  update('formPublishId', publishId)
}

/* --- Form binding toggle --- */

function toggleForm() {
  const data = props.node.data as Record<string, unknown> | undefined
  if (!data) return
  if (data.formSchemaId !== undefined) {
    emit('updateNodeData', 'formSchemaId', undefined)
    emit('updateNodeData', 'formMode', undefined)
    emit('updateNodeData', 'formVariable', undefined)
    emit('updateNodeData', 'hostMethods', undefined)
  } else {
    emit('updateNodeData', 'formSchemaId', '')
    emit('updateNodeData', 'formMode', 'edit')
    emit('updateNodeData', 'formVariable', '')
    emit('updateNodeData', 'hostMethods', ['setValues', 'getValues', 'validate'])
  }
}

/* --- Multi-instance --- */

const multiInstanceType = computed(() => {
  return (props.node.data?.multiInstance?.type as string) ?? 'none'
})

function onMultiInstanceTypeChange(type: string) {
  const data = props.node.data as Record<string, unknown> | undefined
  if (!data) return
  if (type === 'none') {
    const { multiInstance: _, ...rest } = data
    // Clear multiInstance by setting each remaining key
    for (const key of Object.keys(rest)) {
      emit('updateNodeData', key, rest[key])
    }
    // Remove multiInstance
    emit('updateNodeData', 'multiInstance', undefined)
  } else {
    emit('updateNodeData', 'multiInstance', {
      type,
      collection: '',
      elementVariable: '',
      completionCondition: '',
    })
  }
}

function updateMultiInstance(key: string, value: unknown) {
  const current = (props.node.data?.multiInstance as Record<string, unknown>) ?? {}
  emit('updateNodeData', 'multiInstance', { ...current, [key]: value })
}

const showFormFields = computed(() => props.node.data?.formSchemaId !== undefined)
</script>

<template>
  <!-- 节点配置 -->
  <SectionToggle title="节点配置" :count="7">
    <FieldRow label="指派方式">
      <el-radio-group
        :model-value="assigneeType"

        @change="update('assigneeType', $event)"
      >
        <el-radio value="user">指定用户</el-radio>
        <el-radio value="role">指定角色</el-radio>
        <el-radio value="expression">表达式</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow v-if="assigneeType === 'user'" label="审批用户">
      <UserPicker
        :model-value="(node.data?.candidateUsers as string[]) ?? []"
        placeholder="选择审批用户"
        @update:model-value="update('candidateUsers', $event)"
      />
    </FieldRow>

    <FieldRow v-if="assigneeType === 'role'" label="审批角色">
      <el-select
        :model-value="(node.data?.candidateRoles as string[]) ?? []"
        multiple
        filterable
        allow-create

        placeholder="输入或选择角色"
        @change="update('candidateRoles', $event)"
      >
        <el-option label="admin" value="admin" />
        <el-option label="editor" value="editor" />
        <el-option label="viewer" value="viewer" />
      </el-select>
    </FieldRow>

    <FieldRow v-if="assigneeType === 'expression'" label="审批人表达式">
      <el-input
        :model-value="(node.data?.assignee as string) ?? ''"
        placeholder="例: ${variables.manager}"

        @input="update('assignee', $event)"
      />
    </FieldRow>

    <FieldRow label="审批模式">
      <el-radio-group
        :model-value="approvalMode"

        @change="update('approvalMode', $event)"
      >
        <el-radio value="single">单人审批</el-radio>
        <el-radio value="countersign">会签</el-radio>
        <el-radio value="or-sign">或签</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow v-if="approvalMode === 'countersign'" label="最少通过人数">
      <el-input-number
        :model-value="(node.data?.minApprovalCount as number | undefined) ?? undefined"
        :min="1"

        controls-position="right"
        @change="update('minApprovalCount', $event)"
      />
    </FieldRow>

    <template v-if="approvalMode === 'countersign' || approvalMode === 'or-sign'">
      <FieldRow label="审批人集合变量">
        <el-input
          :model-value="(node.data?.assigneeCollection as string) ?? ''"
          placeholder="例: approvers"

          @input="update('assigneeCollection', $event)"
        />
      </FieldRow>
      <div :class="styles.hint">从流程变量中读取该名称对应的数组，为每个元素创建一个审批任务。</div>
    </template>

    <FieldRow label="驳回策略">
      <el-radio-group
        :model-value="rejectPolicy"

        @change="update('rejectPolicy', $event)"
      >
        <el-radio value="follow-global">跟随流程</el-radio>
        <el-radio value="reject-on-all">全部驳回才驳回</el-radio>
        <el-radio value="reject-on-any">一票驳回即驳回</el-radio>
      </el-radio-group>
    </FieldRow>
  </SectionToggle>

  <!-- 高级配置 -->
  <SectionToggle title="高级配置">
    <FieldRow label="关联表单">
      <el-checkbox
        :model-value="showFormFields"
        @change="toggleForm"
      >启用</el-checkbox>
    </FieldRow>

    <template v-if="showFormFields">
      <FieldRow label="选择表单">
        <el-select
          :model-value="(node.data?.formPublishId as string) ?? ''"
          filterable

          placeholder="搜索并选择已发布的表单"
          @change="onFormSelect"
        >
          <el-option
            v-for="form in publishedForms"
            :key="form.id"
            :label="form.name"
            :value="form.publishId"
          />
        </el-select>
      </FieldRow>

      <FieldRow label="表单模式">
        <el-radio-group
          :model-value="(node.data?.formMode as string) ?? 'edit'"

          @change="update('formMode', $event)"
        >
          <el-radio value="edit">编辑</el-radio>
          <el-radio value="view">只读</el-radio>
        </el-radio-group>
      </FieldRow>

      <FieldRow label="数据变量名">
        <el-input
          :model-value="(node.data?.formVariable as string) ?? ''"
          placeholder="例: formData"

          @input="update('formVariable', $event)"
        />
      </FieldRow>
      <div :class="styles.hint">表单数据写入流程变量的名称</div>

      <FieldRow label="宿主方法">
        <el-checkbox-group
          :model-value="(node.data?.hostMethods as string[]) ?? ['setValues', 'getValues', 'validate']"
          @change="update('hostMethods', $event)"
        >
          <el-checkbox value="setValues" label="setValues" />
          <el-checkbox value="getValues" label="getValues" />
          <el-checkbox value="validate" label="validate" />
          <el-checkbox value="submit" label="submit" />
        </el-checkbox-group>
      </FieldRow>
      <div :class="styles.hint">允许宿主调用的表单方法</div>
    </template>
  </SectionToggle>

  <!-- 多实例 -->
  <SectionToggle title="多实例">
    <FieldRow label="多实例类型">
      <el-select
        :model-value="multiInstanceType"

        @change="onMultiInstanceTypeChange"
      >
        <el-option label="无" value="none" />
        <el-option label="顺序" value="sequential" />
        <el-option label="并行" value="parallel" />
      </el-select>
    </FieldRow>

    <template v-if="multiInstanceType !== 'none'">
      <FieldRow label="集合变量">
        <el-input
          :model-value="(node.data?.multiInstance?.collection as string) ?? ''"
          placeholder="流程变量中的集合名称"

          @input="updateMultiInstance('collection', $event)"
        />
      </FieldRow>

      <FieldRow label="元素变量">
        <el-input
          :model-value="(node.data?.multiInstance?.elementVariable as string) ?? ''"
          placeholder="遍历元素的变量名"

          @input="updateMultiInstance('elementVariable', $event)"
        />
      </FieldRow>

      <FieldRow label="完成条件">
        <el-input
          :model-value="(node.data?.multiInstance?.completionCondition as string) ?? ''"
          placeholder="例: ${nrOfCompletedInstances / nrOfInstances >= 0.5}"

          @input="updateMultiInstance('completionCondition', $event)"
        />
      </FieldRow>
      <div :class="styles.hint">使用 BPMN 标准变量：nrOfInstances、nrOfActiveInstances、nrOfCompletedInstances</div>
    </template>
  </SectionToggle>
</template>
