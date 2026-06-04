<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SchemaField } from './SchemaCard.vue'
import type { FlowNode } from './FlowCard.vue'
import type { Widget } from '@/types'

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
  /** raw Widget schema for form preview rendering */
  schemaWidgets?: Widget[]
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

// ---- F4: Form preview rendering ----

/** Only render non-container, non-layout widgets as form fields */
const formWidgets = computed(() =>
  (props.schemaWidgets ?? []).filter((w) =>
    !['form', 'card', 'tabs', 'dialog', 'single-col', 'double-col', 'triple-col', 'quad-col', 'toolbar-buttons', 'divider', 'spacer', 'title'].includes(w.type),
  ),
)

function getWidgetPlaceholder(w: Widget): string {
  const p = w.props as Record<string, unknown> | undefined
  return (p?.placeholder as string) ?? `请输入${w.label ?? w.field ?? ''}`
}

function getWidgetOptions(w: Widget): Array<{ label: string; value: string }> {
  const p = w.props as Record<string, unknown> | undefined
  const opts = p?.options as Array<{ label: string; value: string }> | undefined
  return opts ?? []
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

      <!-- Schema tab — actual form preview -->
      <template v-if="activeTab === 'schema' && schemaData">
        <div :class="$style.previewCard">
          <div :class="$style.previewCardHead">
            <span :class="$style.previewCardTitle">{{ schemaData.title }}</span>
            <span :class="$style.badge">{{ schemaData.fields.length }} fields</span>
          </div>
          <div :class="$style.formPreview">
            <el-form label-position="top" size="default">
              <template v-for="(w, idx) in formWidgets" :key="w.id ?? idx">
                <!-- Input / Number / Date / Textarea -->
                <el-form-item
                  v-if="['input', 'number', 'date', 'textarea', 'richtext'].includes(w.type)"
                  :label="w.label ?? w.field ?? w.type"
                >
                  <el-input
                    :type="w.type === 'textarea' ? 'textarea' : 'text'"
                    :placeholder="getWidgetPlaceholder(w)"
                    :rows="w.type === 'textarea' ? 3 : undefined"
                    disabled
                  />
                </el-form-item>

                <!-- Select -->
                <el-form-item
                  v-else-if="w.type === 'select'"
                  :label="w.label ?? w.field ?? 'select'"
                >
                  <el-select placeholder="请选择" disabled style="width: 100%">
                    <el-option
                      v-for="opt in getWidgetOptions(w)"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </el-form-item>

                <!-- Radio -->
                <el-form-item
                  v-else-if="w.type === 'radio'"
                  :label="w.label ?? w.field ?? 'radio'"
                >
                  <el-radio-group disabled>
                    <el-radio
                      v-for="opt in getWidgetOptions(w)"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </el-radio>
                  </el-radio-group>
                </el-form-item>

                <!-- Checkbox -->
                <el-form-item
                  v-else-if="w.type === 'checkbox'"
                  :label="w.label ?? w.field ?? 'checkbox'"
                >
                  <el-checkbox-group disabled>
                    <el-checkbox
                      v-for="opt in getWidgetOptions(w)"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </el-checkbox>
                  </el-checkbox-group>
                </el-form-item>

                <!-- Switch -->
                <el-form-item
                  v-else-if="w.type === 'switch'"
                  :label="w.label ?? w.field ?? 'switch'"
                >
                  <el-switch disabled />
                </el-form-item>

                <!-- Slider -->
                <el-form-item
                  v-else-if="w.type === 'slider'"
                  :label="w.label ?? w.field ?? 'slider'"
                >
                  <el-slider disabled />
                </el-form-item>

                <!-- Rate -->
                <el-form-item
                  v-else-if="w.type === 'rate'"
                  :label="w.label ?? w.field ?? 'rate'"
                >
                  <el-rate disabled />
                </el-form-item>

                <!-- Upload -->
                <el-form-item
                  v-else-if="w.type === 'upload'"
                  :label="w.label ?? w.field ?? 'upload'"
                >
                  <el-button disabled>选择文件</el-button>
                </el-form-item>

                <!-- Button -->
                <el-form-item v-else-if="w.type === 'button'">
                  <el-button type="primary" disabled>
                    {{ (w.props as Record<string, unknown>)?.text as string ?? w.label ?? '提交' }}
                  </el-button>
                </el-form-item>

                <!-- Fallback: show as text field -->
                <el-form-item
                  v-else
                  :label="w.label ?? w.field ?? w.type"
                >
                  <el-input placeholder="[不支持的组件类型]" disabled />
                </el-form-item>
              </template>
            </el-form>
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
