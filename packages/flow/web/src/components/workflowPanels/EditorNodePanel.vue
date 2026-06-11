<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from '@/components/nodePanels/SectionToggle.vue'
import FieldRow from '@/components/nodePanels/FieldRow.vue'
import HintText from '@/components/nodePanels/HintText.vue'
import { flowApi } from '@/api/flowApi.js'
import styles from './EditorNodePanel.module.scss'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

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
    // dropdown stays empty
  }
})

function onSchemaSelect(publishId: string) {
  const form = publishedForms.value.find((f) => f.publishId === publishId)
  update('formSchemaId', form?.id ?? '')
  update('formPublishId', publishId)
}

/* --- Form mode --- */

const formMode = computed(() => (props.node.data?.formMode as string) ?? 'editable')

/* --- Output variable --- */

const outputVariable = computed(() => (props.node.data?.outputVariable as string) ?? '')

/* --- Failure strategy --- */

const failureStrategy = computed(() => (props.node.data?.failureStrategy as string) ?? 'abort')

/* --- Timeout --- */

const timeout = computed(() => (props.node.data?.timeout as number | undefined) ?? undefined)
</script>

<template>
  <!-- 表单配置 -->
  <SectionToggle title="表单配置" :count="3">
    <FieldRow label="Schema 选择">
      <el-select
        :model-value="(node.data?.formPublishId as string) ?? ''"
        filterable
        placeholder="搜索并选择已发布的表单"
        @change="onSchemaSelect"
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
        :model-value="formMode"
        @change="update('formMode', $event)"
      >
        <el-radio value="editable">编辑</el-radio>
        <el-radio value="readonly">只读</el-radio>
      </el-radio-group>
    </FieldRow>

    <template v-if="formMode === 'editable'">
      <FieldRow label="可编辑字段">
        <el-select
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
      <HintText>指定可编辑的字段名，其余字段默认只读。留空则全部可编辑。</HintText>
    </template>
  </SectionToggle>

  <!-- 数据绑定 -->
  <SectionToggle title="数据绑定" :count="1">
    <FieldRow label="输出变量">
      <el-input
        :model-value="outputVariable"
        placeholder="例: editorResult"
        @input="update('outputVariable', $event)"
      />
    </FieldRow>
    <HintText>编辑器提交的数据将写入该流程变量名</HintText>
  </SectionToggle>

  <!-- 高级设置 -->
  <SectionToggle title="高级设置" :count="2" :default-open="false">
    <FieldRow label="超时时间">
      <el-input-number
        :model-value="timeout"
        :min="0"
        :step="5"
        controls-position="right"
        placeholder="分钟"
        @change="update('timeout', $event)"
      />
    </FieldRow>
    <HintText>留空表示不设超时限制。单位：分钟。</HintText>

    <FieldRow label="失败策略">
      <el-radio-group
        :model-value="failureStrategy"
        @change="update('failureStrategy', $event)"
      >
        <el-radio value="abort">终止流程</el-radio>
        <el-radio value="skip">跳过继续</el-radio>
        <el-radio value="retry">自动重试</el-radio>
      </el-radio-group>
    </FieldRow>
  </SectionToggle>
</template>
