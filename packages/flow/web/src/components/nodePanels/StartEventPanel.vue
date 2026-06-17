<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'
import { flowApi } from '../../api/flowApi'
import styles from './StartEventPanel.module.scss'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

/* --- Published templates --- */

interface PublishedTemplate {
  id: string
  name: string
  publishId: string
  type?: string
}

const publishedTemplates = ref<PublishedTemplate[]>([])

onMounted(async () => {
  try {
    const data = await flowApi.getPublishedForms()
    publishedTemplates.value = data as PublishedTemplate[]
  } catch {
    // ignore -- dropdown stays empty
  }
})

function onTemplateSelect(publishId: string) {
  const template = publishedTemplates.value.find((t) => t.publishId === publishId)
  update('templateSchemaId', template?.id ?? '')
  update('templatePublishId', publishId)
}

/* --- Template binding toggle --- */

function toggleTemplate() {
  const data = props.node.data as Record<string, unknown> | undefined
  if (!data) return
  if (data.templateSchemaId !== undefined) {
    emit('updateNodeData', 'templateSchemaId', undefined)
    emit('updateNodeData', 'templatePublishId', undefined)
    emit('updateNodeData', 'templateMode', undefined)
    emit('updateNodeData', 'templateVariable', undefined)
  } else {
    emit('updateNodeData', 'templateSchemaId', '')
    emit('updateNodeData', 'templatePublishId', '')
    emit('updateNodeData', 'templateMode', 'editable')
    emit('updateNodeData', 'templateVariable', 'formData')
  }
}

const showTemplateFields = computed(() => props.node.data?.templateSchemaId !== undefined)
</script>

<template>
  <!-- 节点配置 -->
  <SectionToggle title="节点配置" :count="3">
    <FieldRow label="触发方式">
      <el-radio-group
        :model-value="(node.data?.triggerType as string) ?? 'manual'"
        @change="update('triggerType', $event)"
      >
        <el-radio value="manual">手动触发</el-radio>
        <el-radio value="auto">自动触发</el-radio>
        <el-radio value="message">消息触发</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow v-if="(node.data?.triggerType as string) === 'message'" label="消息名称">
      <el-input
        :model-value="(node.data?.messageName as string) ?? ''"
        placeholder="消息名称"
        @input="update('messageName', $event)"
      />
    </FieldRow>

    <FieldRow v-if="(node.data?.triggerType as string) === 'auto'" label="启动条件">
      <el-input
        :model-value="(node.data?.startCondition as string) ?? ''"
        placeholder="例: ${variables.approvalRequired === true}"
        @input="update('startCondition', $event)"
      />
    </FieldRow>
  </SectionToggle>

  <!-- 关联模板 -->
  <SectionToggle title="关联模板">
    <FieldRow label="启用模板">
      <el-checkbox
        :model-value="showTemplateFields"
        @change="toggleTemplate"
      >启用</el-checkbox>
    </FieldRow>

    <template v-if="showTemplateFields">
      <FieldRow label="选择模板">
        <el-select
          :model-value="(node.data?.templatePublishId as string) ?? ''"
          filterable
          placeholder="搜索并选择已发布的模板"
          @change="onTemplateSelect"
        >
          <el-option
            v-for="template in publishedTemplates"
            :key="template.id"
            :label="template.name"
            :value="template.publishId"
          />
        </el-select>
      </FieldRow>

      <FieldRow label="模板模式">
        <el-radio-group
          :model-value="(node.data?.templateMode as string) ?? 'editable'"
          @change="update('templateMode', $event)"
        >
          <el-radio value="editable">可编辑</el-radio>
          <el-radio value="readonly">只读</el-radio>
        </el-radio-group>
      </FieldRow>

      <FieldRow label="数据变量名">
        <el-input
          :model-value="(node.data?.templateVariable as string) ?? 'formData'"
          placeholder="例: formData"
          @input="update('templateVariable', $event)"
        />
      </FieldRow>
      <div :class="styles.hint">模板数据写入流程变量的名称</div>
    </template>
  </SectionToggle>
</template>
