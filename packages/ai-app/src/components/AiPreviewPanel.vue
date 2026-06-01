<script setup lang="ts">
import { ref } from 'vue'
import type { SchemaField } from './SchemaCard.vue'
import type { FlowNode } from './FlowCard.vue'

export interface PreviewSchemaData {
  title: string
  fields: SchemaField[]
}

export interface PreviewFlowData {
  title: string
  nodes: FlowNode[]
  /** optional node form schemas bound to flow nodes */
  nodeForms?: Array<{
    title: string
    fields: SchemaField[]
  }>
}

export type PreviewTab = 'schema' | 'json' | 'flow'

export interface AiPreviewPanelProps {
  /** which tabs to show */
  tabs: PreviewTab[]
  schemaData?: PreviewSchemaData
  flowData?: PreviewFlowData
  /** raw JSON string for the JSON tab */
  jsonString?: string
  /** primary action label */
  primaryAction?: string
  /** secondary action label */
  secondaryAction?: string
}

const props = withDefaults(defineProps<AiPreviewPanelProps>(), {
  tabs: () => ['schema', 'json'],
  primaryAction: '确认发布',
  secondaryAction: '在编辑器中打开',
})

const emit = defineEmits<{
  'primary-action': []
  'secondary-action': []
}>()

const activeTab = ref<PreviewTab>(props.tabs[0])

const tabLabels: Record<PreviewTab, string> = {
  schema: 'Schema',
  json: 'JSON',
  flow: 'Flow',
}
</script>

<template>
  <div :class="$style.preview">
    <!-- Header -->
    <div :class="$style.header">
      <span :class="$style.title">预览</span>
      <div :class="$style.tabs">
        <span
          v-for="tab in tabs"
          :key="tab"
          :class="[$style.tab, { [$style.tabActive]: activeTab === tab }]"
          @click="activeTab = tab"
        >
          {{ tabLabels[tab] }}
        </span>
      </div>
    </div>

    <!-- Body -->
    <div :class="$style.body">
      <!-- Empty state -->
      <div
        v-if="activeTab === 'schema' && !schemaData"
        :class="$style.empty"
      >
        <div :class="$style.emptyIcon">&#x1F441;</div>
        <div :class="$style.emptyText">生成内容将在此预览</div>
      </div>
      <div
        v-if="activeTab === 'flow' && !flowData"
        :class="$style.empty"
      >
        <div :class="$style.emptyIcon">&#x1F441;</div>
        <div :class="$style.emptyText">生成内容将在此预览</div>
      </div>

      <!-- Schema tab -->
      <template v-if="activeTab === 'schema' && schemaData">
        <div :class="$style.previewCard">
          <div :class="$style.previewCardHead">
            <span :class="$style.previewCardTitle">{{ schemaData.title }}</span>
            <span :class="$style.badge">{{ schemaData.fields.length }} fields</span>
          </div>
          <div :class="$style.previewCardBody">
            <div
              v-for="(field, idx) in schemaData.fields"
              :key="idx"
              :class="$style.previewField"
            >
              <div :class="$style.previewFieldIcon">{{ field.icon }}</div>
              <div :class="$style.previewFieldInfo">
                <div :class="$style.previewFieldName">{{ field.name }}</div>
                <div :class="$style.previewFieldMeta">
                  {{ field.type }}<template v-if="field.meta"> &middot; {{ field.meta }}</template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Flow tab -->
      <template v-if="activeTab === 'flow' && flowData">
        <div :class="$style.previewCard">
          <div :class="$style.previewCardHead">
            <span :class="$style.previewCardTitle">{{ flowData.title }}</span>
            <span :class="$style.badge">{{ flowData.nodes.length }} nodes</span>
          </div>
          <div :class="$style.flowBody">
            <template v-for="(node, idx) in flowData.nodes" :key="idx">
              <span v-if="idx > 0" :class="$style.arrow">&rarr;</span>
              <span :class="[$style.node, $style[node.type]]">{{ node.label }}</span>
            </template>
          </div>
        </div>

        <!-- Node form schemas -->
        <div
          v-for="(form, fIdx) in flowData.nodeForms"
          :key="fIdx"
          :class="$style.previewCard"
        >
          <div :class="$style.previewCardHead">
            <span :class="$style.previewCardTitle">{{ form.title }}</span>
            <span :class="$style.badge">{{ form.fields.length }} fields</span>
          </div>
          <div :class="$style.previewCardBody">
            <div
              v-for="(field, idx) in form.fields"
              :key="idx"
              :class="$style.previewField"
            >
              <div :class="$style.previewFieldIcon">{{ field.icon }}</div>
              <div :class="$style.previewFieldInfo">
                <div :class="$style.previewFieldName">{{ field.name }}</div>
                <div :class="$style.previewFieldMeta">{{ field.type }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- JSON tab -->
      <template v-if="activeTab === 'json'">
        <pre v-if="jsonString" :class="$style.jsonBlock">{{ jsonString }}</pre>
        <div v-else :class="$style.empty">
          <div :class="$style.emptyIcon">&#x1F441;</div>
          <div :class="$style.emptyText">生成内容将在此预览</div>
        </div>
      </template>
    </div>

    <!-- Bottom actions -->
    <div
      v-if="(activeTab === 'schema' && schemaData) || (activeTab === 'flow' && flowData)"
      :class="$style.actions"
    >
      <button :class="$style.btnPrimary" @click="emit('primary-action')">
        {{ primaryAction }}
      </button>
      <button :class="$style.btnGhost" @click="emit('secondary-action')">
        {{ secondaryAction }}
      </button>
    </div>
  </div>
</template>

<style module src="./AiPreviewPanel.module.css" />
