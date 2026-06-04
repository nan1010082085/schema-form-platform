<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import type { SchemaField } from './SchemaCard.vue'
import type { FlowNode } from './FlowCard.vue'
import type { Widget, FlowGraph, FlowNodeData } from '@/types'
import { useFlowPreview } from '@/composables/useFlowPreview'
import { usePreviewInteraction } from '@/composables/usePreviewInteraction'
import {
  PreviewStartEvent,
  PreviewEndEvent,
  PreviewTask,
  PreviewGateway,
} from './flow-preview'
import AiFieldEditor from './AiFieldEditor.vue'

export interface PreviewSchemaData {
  title: string
  fields: SchemaField[]
}

export interface PreviewFlowData {
  title: string
  nodes: FlowNode[]
  /** Full FlowGraph for Vue Flow rendering */
  graph?: FlowGraph
  /** optional node form schemas bound to flow nodes */
  nodeForms?: Array<{
    title: string
    fields: SchemaField[]
  }>
}

export type PreviewTab = 'schema' | 'json' | 'flow'

export type SchemaBuildStep = 'layout' | 'components' | 'validation' | 'styling'

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
  /** 流式 Schema 生成的当前步骤 */
  currentBuildStep?: SchemaBuildStep | null
  /** 流式 Schema 生成的步骤列表 */
  buildSteps?: SchemaBuildStep[]
  /** 高亮的字段 ID 列表（AI 修改的字段） */
  highlightedFieldIds?: string[]
  /** 是否显示对比按钮 */
  showCompareButton?: boolean
}

const props = withDefaults(defineProps<AiPreviewPanelProps>(), {
  tabs: () => ['schema', 'json'],
  primaryAction: '确认发布',
  secondaryAction: '在编辑器中打开',
  highlightedFieldIds: () => [],
  showCompareButton: false,
})

const emit = defineEmits<{
  'primary-action': []
  'secondary-action': []
  'node-click': [nodeId: string, nodeData: Record<string, unknown>]
  'field-click': [fieldId: string, fieldData: Record<string, unknown>]
  'field-edit': [fieldId: string, data: Record<string, unknown>]
  'apply-to-editor': [widgetIds?: string[]]
  'compare': []
}>()

const activeTab = ref<PreviewTab>(props.tabs[0])

const tabLabels: Record<PreviewTab, string> = {
  schema: 'Schema',
  json: 'JSON',
  flow: 'Flow',
}

// ---- 交互状态管理 ----

const interaction = usePreviewInteraction()

// 同步高亮字段
watch(
  () => props.highlightedFieldIds,
  (ids) => {
    interaction.setHighlightedFields(ids)
  },
  { immediate: true },
)

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

// ---- 字段交互 ----

function handleFieldClick(widget: Widget) {
  interaction.selectField(widget)
  emit('field-click', widget.id, {
    type: widget.type,
    label: widget.label,
    field: widget.field,
    ...widget.props,
  })
}

function handleFieldEdit(widget: Widget) {
  interaction.openFieldEdit(widget)
}

function handleFieldSave(id: string, data: Record<string, unknown>) {
  emit('field-edit', id, data)
  interaction.closeEditDialog()
}

function isFieldHighlighted(widgetId: string): boolean {
  return interaction.isFieldHighlighted.value(widgetId)
}

// ---- 部分应用 ----

function handleApplyToEditor() {
  if (interaction.hasSelection.value) {
    emit('apply-to-editor', Array.from(interaction.selectedWidgetIds.value))
  } else {
    emit('apply-to-editor')
  }
}

function handleToggleSelection(widgetId: string) {
  interaction.toggleWidgetSelection(widgetId)
}

function handleSelectAll() {
  interaction.selectAllWidgets(formWidgets.value)
}

// ---- 流式 Schema 生成步骤 ----

const defaultBuildSteps: SchemaBuildStep[] = ['layout', 'components', 'validation', 'styling']

const stepLabels: Record<SchemaBuildStep, string> = {
  layout: '布局结构',
  components: '表单组件',
  validation: '验证规则',
  styling: '样式配置',
}

const stepIcons: Record<SchemaBuildStep, string> = {
  layout: '&#x1F9E9;',
  components: '&#x1F4E6;',
  validation: '&#x2705;',
  styling: '&#x1F3A8;',
}

const activeBuildSteps = computed(() => props.buildSteps ?? defaultBuildSteps)

const currentStepIndex = computed(() => {
  if (!props.currentBuildStep) return -1
  return activeBuildSteps.value.indexOf(props.currentBuildStep)
})

// ---- Vue Flow Preview ----

const flowGraphRef = computed(() => props.flowData?.graph)

const { nodes, edges, nodeCount, edgeCount } = useFlowPreview(flowGraphRef)

const { onNodeClick, fitView } = useVueFlow({
  id: 'ai-flow-preview',
})

onNodeClick(({ node }) => {
  interaction.selectNode(node.id, node.data as FlowNodeData)
  emit('node-click', node.id, node.data as Record<string, unknown>)
})

/** Auto fitView when flow data changes */
watch(
  () => props.flowData?.graph,
  async (graph) => {
    if (graph && activeTab.value === 'flow') {
      await nextTick()
      setTimeout(() => fitView({ padding: 0.2 }), 100)
    }
  },
  { deep: true },
)

/** fitView when switching to flow tab */
watch(activeTab, async (tab) => {
  if (tab === 'flow' && props.flowData?.graph) {
    await nextTick()
    setTimeout(() => fitView({ padding: 0.2 }), 100)
  }
  // Clear selection when switching tabs
  interaction.clearFieldSelection()
  interaction.clearNodeSelection()
})

function handleFitView() {
  fitView({ padding: 0.2 })
}

function handleNodeEdit() {
  if (interaction.selectedNodeDetail.value) {
    interaction.openNodeEdit(
      interaction.selectedNodeDetail.value.id,
      interaction.selectedNodeDetail.value.data,
    )
  }
}

function getNodeTypeLabel(bpmnType: string): string {
  const labels: Record<string, string> = {
    startEvent: '开始事件',
    endEvent: '结束事件',
    userTask: '用户任务',
    serviceTask: '服务任务',
    scriptTask: '脚本任务',
    sendTask: '发送任务',
    receiveTask: '接收任务',
    exclusiveGateway: '排他网关',
    parallelGateway: '并行网关',
    inclusiveGateway: '包含网关',
  }
  return labels[bpmnType] ?? bpmnType
}

function getNodeStatusColor(nodeId: string): string | undefined {
  const status = interaction.getNodeStatus(nodeId)
  return status ? interaction.getNodeStatusColor(status) : undefined
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
      <div :class="$style.headerActions">
        <button
          v-if="showCompareButton"
          :class="$style.headerBtn"
          title="对比模式"
          @click="emit('compare')"
        >
          &#x2194;
        </button>
      </div>
    </div>

    <!-- Build Steps Progress -->
    <div v-if="currentBuildStep" :class="$style.buildSteps">
      <div
        v-for="(step, idx) in activeBuildSteps"
        :key="step"
        :class="[
          $style.buildStep,
          {
            [$style.buildStepDone]: idx < currentStepIndex,
            [$style.buildStepActive]: idx === currentStepIndex,
            [$style.buildStepPending]: idx > currentStepIndex,
          },
        ]"
      >
        <span :class="$style.buildStepIcon" v-html="stepIcons[step]" />
        <span :class="$style.buildStepLabel">{{ stepLabels[step] }}</span>
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
            <div :class="$style.previewCardActions">
              <span :class="$style.badge">{{ schemaData.fields.length }} fields</span>
              <button
                v-if="formWidgets.length > 0"
                :class="$style.selectAllBtn"
                @click="handleSelectAll"
              >
                全选
              </button>
            </div>
          </div>
          <div :class="$style.formPreview">
            <el-form label-position="top" size="default">
              <template v-for="w in formWidgets" :key="w.id">
                <div
                  :class="[
                    $style.fieldWrapper,
                    {
                      [$style.fieldHighlighted]: isFieldHighlighted(w.id),
                      [$style.fieldSelected]: interaction.selectedWidgetIds.value.has(w.id),
                    },
                  ]"
                  @click="handleFieldClick(w)"
                >
                  <!-- 选择框 -->
                  <el-checkbox
                    :model-value="interaction.selectedWidgetIds.value.has(w.id)"
                    :class="$style.fieldCheckbox"
                    @click.stop
                    @change="handleToggleSelection(w.id)"
                  />

                  <!-- 字段内容 -->
                  <div :class="$style.fieldContent">
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
                  </div>

                  <!-- 编辑按钮 -->
                  <button
                    :class="$style.fieldEditBtn"
                    title="编辑属性"
                    @click.stop="handleFieldEdit(w)"
                  >
                    &#x270E;
                  </button>
                </div>
              </template>
            </el-form>
          </div>
        </div>
      </template>

      <!-- Flow tab — Vue Flow visualization -->
      <template v-if="activeTab === 'flow' && flowData">
        <!-- Vue Flow canvas -->
        <div v-if="flowData.graph" :class="$style.flowCanvasWrapper">
          <div :class="$style.flowToolbar">
            <span :class="$style.flowStats">{{ nodeCount }} 节点 / {{ edgeCount }} 连线</span>
            <button :class="$style.fitBtn" title="适配画布" @click="handleFitView">
              &#x26F6;
            </button>
          </div>
          <div :class="$style.flowCanvas">
            <VueFlow
              :nodes="nodes"
              :edges="edges"
              :nodes-draggable="true"
              :nodes-connectable="false"
              :edges-updatable="false"
              :elements-selectable="true"
              :default-viewport="{ zoom: 0.8, x: 0, y: 0 }"
              :min-zoom="0.2"
              :max-zoom="2"
              fit-view-on-init
            >
              <template #node-start-event="nodeProps">
                <PreviewStartEvent v-bind="nodeProps" />
              </template>
              <template #node-end-event="nodeProps">
                <PreviewEndEvent v-bind="nodeProps" />
              </template>
              <template #node-task="nodeProps">
                <PreviewTask v-bind="nodeProps" />
              </template>
              <template #node-gateway="nodeProps">
                <PreviewGateway v-bind="nodeProps" />
              </template>

              <Background :gap="16" :size="0.6" color="#e0e5ec" />
              <Controls :show-interactive="false" />
            </VueFlow>
          </div>

          <!-- Node detail panel -->
          <div v-if="interaction.selectedNodeDetail.value" :class="$style.nodeDetail">
            <div :class="$style.nodeDetailHeader">
              <span :class="$style.nodeDetailTitle">{{ interaction.selectedNodeDetail.value.data.label }}</span>
              <div :class="$style.nodeDetailActions">
                <button :class="$style.nodeEditBtn" title="编辑节点" @click="handleNodeEdit">
                  &#x270E;
                </button>
                <button :class="$style.nodeDetailClose" @click="interaction.clearNodeSelection()">
                  &times;
                </button>
              </div>
            </div>
            <div :class="$style.nodeDetailBody">
              <div :class="$style.nodeDetailRow">
                <span :class="$style.nodeDetailLabel">类型</span>
                <span :class="$style.nodeDetailValue">
                  <span
                    v-if="getNodeStatusColor(interaction.selectedNodeDetail.value.id)"
                    :class="$style.statusDot"
                    :style="{ background: getNodeStatusColor(interaction.selectedNodeDetail.value.id) }"
                  />
                  {{ getNodeTypeLabel(interaction.selectedNodeDetail.value.data.bpmnType) }}
                </span>
              </div>
              <div :class="$style.nodeDetailRow">
                <span :class="$style.nodeDetailLabel">ID</span>
                <span :class="$style.nodeDetailValue">{{ interaction.selectedNodeDetail.value.id }}</span>
              </div>
              <div v-if="interaction.selectedNodeDetail.value.data.description" :class="$style.nodeDetailRow">
                <span :class="$style.nodeDetailLabel">描述</span>
                <span :class="$style.nodeDetailValue">{{ interaction.selectedNodeDetail.value.data.description }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Fallback: simple linear view when no graph data -->
        <div v-else :class="$style.previewCard">
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
      <button :class="$style.btnApply" @click="handleApplyToEditor">
        {{ interaction.hasSelection.value ? `应用选中 (${interaction.selectedCount.value})` : '应用到编辑器' }}
      </button>
      <button :class="$style.btnGhost" @click="emit('secondary-action')">
        {{ secondaryAction }}
      </button>
    </div>

    <!-- 字段编辑弹窗 -->
    <AiFieldEditor
      :visible="interaction.isEditDialogVisible.value"
      :context="interaction.editContext.value"
      @update:visible="interaction.closeEditDialog()"
      @save="handleFieldSave"
      @cancel="interaction.closeEditDialog()"
    />
  </div>
</template>

<style module src="./AiPreviewPanel.module.css" />
