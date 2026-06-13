<script setup lang="ts">
/**
 * WorkflowTemplateCard — 工作流模板卡片
 *
 * 展示单个工作流模板的卡片组件，包含流程图预览、名称描述、分类标签、使用次数和操作按钮。
 */
import { computed } from 'vue'
import { BrowseIcon, AddIcon, LinkIcon } from 'tdesign-icons-vue-next'
import type { WorkflowTemplateItem } from '@/utils/apiClient'
import styles from './WorkflowTemplateCard.module.scss'

const props = defineProps<{
  template: WorkflowTemplateItem
}>()

const emit = defineEmits<{
  use: [template: WorkflowTemplateItem]
  preview: [template: WorkflowTemplateItem]
}>()

// ---- 分类映射 ----
const CATEGORY_TAG_THEME: Record<string, string> = {
  '人事': 'default',
  '财务': 'success',
  '采购': 'warning',
  '行政': 'default',
  'IT': 'danger',
  '其他': 'default',
}

const CATEGORY_LABELS: Record<string, string> = {
  '人事': '人事',
  '财务': '财务',
  '采购': '采购',
  '行政': '行政',
  'IT': 'IT',
  '其他': '其他',
}

const categoryTagTheme = computed(() => CATEGORY_TAG_THEME[props.template.category] ?? 'default')
const categoryLabel = computed(() => CATEGORY_LABELS[props.template.category] ?? props.template.category)

// ---- 流程节点展示 ----
interface FlowNode {
  id: string
  label: string
  type: string
}

const flowNodes = computed<FlowNode[]>(() => {
  const nodes = (props.template.flowDefinition?.nodes ?? []) as Array<Record<string, unknown>>
  return nodes.map(n => ({
    id: n.id as string,
    label: (n.data as Record<string, unknown>)?.label as string ?? n.id as string,
    type: (n.data as Record<string, unknown>)?.bpmnType as string ?? 'unknown',
  }))
})

const nodeCount = computed(() => flowNodes.value.length)

function getNodeChipClass(bpmnType: string): string {
  if (bpmnType === 'bpmn:StartEvent') return styles.flowNodeChipStart
  if (bpmnType === 'bpmn:EndEvent') return styles.flowNodeChipEnd
  if (bpmnType === 'bpmn:UserTask') return styles.flowNodeChipTask
  if (bpmnType === 'bpmn:ExclusiveGateway') return styles.flowNodeChipGateway
  return ''
}
</script>

<template>
  <div :class="styles.card">
    <!-- 卡片头：流程预览 -->
    <div :class="styles.cardHeader">
      <div :class="styles.flowPreview">
        <div :class="styles.flowNodeList">
          <span
            v-for="node in flowNodes.slice(0, 4)"
            :key="node.id"
            :class="[styles.flowNodeChip, getNodeChipClass(node.type)]"
          >
            {{ node.label }}
          </span>
          <span v-if="flowNodes.length > 4" :class="styles.flowNodeMore">
            +{{ flowNodes.length - 4 }}
          </span>
        </div>
        <div :class="styles.flowNodeCount">
          <LinkIcon :size="12" />
          {{ nodeCount }} 个节点
        </div>
      </div>
      <t-tag
        :theme="categoryTagTheme as any"
        :class="styles.cardCategory"
        size="small"
        variant="dark"
      >
        {{ categoryLabel }}
      </t-tag>
      <span v-if="template.isBuiltin" :class="styles.builtinBadge">内置</span>
    </div>

    <!-- 卡片内容 -->
    <div :class="styles.cardBody">
      <h3 :class="styles.cardTitle">{{ template.name }}</h3>
      <p :class="styles.cardDesc">{{ template.description || '暂无描述' }}</p>
      <div :class="styles.cardMeta">
        <span :class="styles.metaItem">
          <BrowseIcon :size="12" />
          {{ template.useCount }} 次使用
        </span>
      </div>
      <!-- 标签 -->
      <div v-if="template.tags.length > 0" :class="styles.tagList">
        <t-tag
          v-for="tag in template.tags"
          :key="tag"
          size="small"
          theme="default"
          variant="light"
          :class="styles.tag"
        >
          {{ tag }}
        </t-tag>
      </div>
    </div>

    <!-- 卡片操作 -->
    <div :class="styles.cardActions">
      <t-button
        theme="primary"
        size="small"
        :class="styles.actionBtn"
        @click="emit('use', template)"
      >
        <template #icon><AddIcon /></template>
        使用模板
      </t-button>
      <t-button
        size="small"
        :class="styles.actionBtn"
        @click="emit('preview', template)"
      >
        <template #icon><BrowseIcon /></template>
        预览
      </t-button>
    </div>
  </div>
</template>
