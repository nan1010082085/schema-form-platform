<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'
import UserPicker from '../UserPicker.vue'
import RolePicker from '../RolePicker.vue'
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
    emit('updateNodeData', 'editableFields', undefined)
    emit('updateNodeData', 'formVariable', undefined)
    emit('updateNodeData', 'hostMethods', undefined)
  } else {
    emit('updateNodeData', 'formSchemaId', '')
    emit('updateNodeData', 'formMode', 'editable')
    emit('updateNodeData', 'editableFields', [])
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
      <t-radio-group
        :model-value="assigneeType"

        @change="update('assigneeType', $event)"
      >
        <t-radio value="user">指定用户</t-radio>
        <t-radio value="role">指定角色</t-radio>
        <t-radio value="expression">表达式</t-radio>
      </t-radio-group>
    </FieldRow>

    <FieldRow v-if="assigneeType === 'user'" label="审批用户">
      <UserPicker
        :model-value="(node.data?.candidateUsers as string[]) ?? []"
        placeholder="选择审批用户"
        users-only
        @update:model-value="update('candidateUsers', $event)"
      />
    </FieldRow>

    <FieldRow v-if="assigneeType === 'role'" label="审批角色">
      <RolePicker
        :model-value="(node.data?.candidateRoles as string[]) ?? []"
        placeholder="选择审批角色"
        @update:model-value="update('candidateRoles', $event)"
      />
    </FieldRow>

    <FieldRow v-if="assigneeType === 'expression'" label="审批人表达式">
      <t-input
        :model-value="(node.data?.assignee as string) ?? ''"
        placeholder="例: ${variables.manager}"

        @input="update('assignee', $event)"
      />
    </FieldRow>

    <FieldRow label="审批模式">
      <t-radio-group
        :model-value="approvalMode"

        @change="update('approvalMode', $event)"
      >
        <t-radio value="single">单人审批</t-radio>
        <t-radio value="countersign">会签</t-radio>
        <t-radio value="or-sign">或签</t-radio>
      </t-radio-group>
    </FieldRow>

    <FieldRow v-if="approvalMode === 'countersign'" label="最少通过人数">
      <t-input-number
        :model-value="(node.data?.minApprovalCount as number | undefined) ?? undefined"
        :min="1"

        @change="update('minApprovalCount', $event)"
      />
    </FieldRow>

    <template v-if="approvalMode === 'countersign' || approvalMode === 'or-sign'">
      <FieldRow label="审批人集合变量">
        <t-input
          :model-value="(node.data?.assigneeCollection as string) ?? ''"
          placeholder="例: approvers"

          @input="update('assigneeCollection', $event)"
        />
      </FieldRow>
      <div :class="styles.hint">从流程变量中读取该名称对应的数组，为每个元素创建一个审批任务。</div>
    </template>

    <FieldRow label="驳回策略">
      <t-radio-group
        :model-value="rejectPolicy"

        @change="update('rejectPolicy', $event)"
      >
        <t-radio value="follow-global">跟随流程</t-radio>
        <t-radio value="reject-on-all">全部驳回才驳回</t-radio>
        <t-radio value="reject-on-any">一票驳回即驳回</t-radio>
      </t-radio-group>
    </FieldRow>
  </SectionToggle>

  <!-- 高级配置 -->
  <SectionToggle title="高级配置">
    <FieldRow label="关联表单">
      <t-checkbox
        :model-value="showFormFields"
        @change="toggleForm"
      >启用</t-checkbox>
    </FieldRow>

    <template v-if="showFormFields">
      <FieldRow label="选择表单">
        <t-select
          :model-value="(node.data?.formPublishId as string) ?? ''"
          filterable

          placeholder="搜索并选择已发布的表单"
          @change="onFormSelect"
        >
          <t-option
            v-for="form in publishedForms"
            :key="form.id"
            :label="form.name"
            :value="form.publishId"
          />
        </t-select>
      </FieldRow>

      <FieldRow label="表单模式">
        <t-radio-group
          :model-value="(node.data?.formMode as string) ?? 'edit'"

          @change="update('formMode', $event)"
        >
          <t-radio value="editable">可编辑</t-radio>
          <t-radio value="readonly">只读</t-radio>
          <t-radio value="partial">部分编辑</t-radio>
        </t-radio-group>
      </FieldRow>

      <template v-if="(node.data?.formMode as string) === 'partial'">
        <FieldRow label="可编辑字段">
          <t-select
            :model-value="(node.data?.editableFields as string[]) ?? []"
            multiple
            filterable
            allow-create
            default-first-option
            collapse-tags
            collapse-tags-tooltip
            placeholder="输入字段名并回车"
            @change="update('editableFields', $event)"
          />
        </FieldRow>
        <div :class="styles.hint">指定可编辑的字段名，其余字段默认只读。留空则全部只读。</div>
      </template>

      <FieldRow label="数据变量名">
        <t-input
          :model-value="(node.data?.formVariable as string) ?? ''"
          placeholder="例: formData"

          @input="update('formVariable', $event)"
        />
      </FieldRow>
      <div :class="styles.hint">表单数据写入流程变量的名称</div>

      <FieldRow label="宿主方法">
        <t-select
          :model-value="(node.data?.hostMethods as string[]) ?? ['setValues', 'getValues', 'validate']"
          multiple
          collapse-tags
          collapse-tags-tooltip
          placeholder="选择宿主方法"
          @change="update('hostMethods', $event)"
        >
          <t-option value="setValues" label="setValues" />
          <t-option value="getValues" label="getValues" />
          <t-option value="validate" label="validate" />
          <t-option value="submit" label="submit" />
        </t-select>
      </FieldRow>
      <div :class="styles.hint">允许宿主调用的表单方法</div>
    </template>
  </SectionToggle>

  <!-- 多实例 -->
  <SectionToggle title="多实例">
    <FieldRow label="多实例类型">
      <t-select
        :model-value="multiInstanceType"

        @change="onMultiInstanceTypeChange"
      >
        <t-option label="无" value="none" />
        <t-option label="顺序" value="sequential" />
        <t-option label="并行" value="parallel" />
      </t-select>
    </FieldRow>

    <template v-if="multiInstanceType !== 'none'">
      <FieldRow label="集合变量">
        <t-input
          :model-value="(node.data?.multiInstance?.collection as string) ?? ''"
          placeholder="流程变量中的集合名称"

          @input="updateMultiInstance('collection', $event)"
        />
      </FieldRow>

      <FieldRow label="元素变量">
        <t-input
          :model-value="(node.data?.multiInstance?.elementVariable as string) ?? ''"
          placeholder="遍历元素的变量名"

          @input="updateMultiInstance('elementVariable', $event)"
        />
      </FieldRow>

      <FieldRow label="完成条件">
        <t-input
          :model-value="(node.data?.multiInstance?.completionCondition as string) ?? ''"
          placeholder="例: ${nrOfCompletedInstances / nrOfInstances >= 0.5}"

          @input="updateMultiInstance('completionCondition', $event)"
        />
      </FieldRow>
      <div :class="styles.hint">使用 BPMN 标准变量：nrOfInstances、nrOfActiveInstances、nrOfCompletedInstances</div>
    </template>
  </SectionToggle>
</template>
