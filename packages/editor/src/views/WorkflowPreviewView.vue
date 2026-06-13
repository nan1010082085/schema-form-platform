<script setup lang="ts">
/**
 * WorkflowPreviewView — 工作流预览页
 *
 * 左侧：表单预览（WidgetRenderer 渲染关联表单）
 * 右侧：流程图预览（VueFlow 渲染关联流程定义）
 * 底部：数据更新规则展示
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LoadingIcon, CloseCircleFilledIcon, ChevronRightIcon } from 'tdesign-icons-vue-next'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import { WidgetRenderer } from '@/components/WidgetRenderer'
import type { PartialWidget } from '@/components/WidgetRenderer'
import type { WorkflowItem } from '@/utils/apiClient'
import {
  fetchWorkflowById,
  fetchSchemaById,
  fetchLatestFlowVersion,
  type FlowVersionItem,
} from '@/utils/apiClient'
import { registerAllWidgets } from '@/widgets'
import { useAppStore } from '@/stores/app'
import styles from './WorkflowPreviewView.module.scss'

registerAllWidgets()

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const workflowId = computed(() => route.params.id as string)

// ── 状态 ──
const workflow = ref<WorkflowItem | null>(null)
const schema = ref<PartialWidget[]>([])
const flowVersion = ref<FlowVersionItem | null>(null)
const loading = ref(true)
const error = ref('')
const rulesExpanded = ref(true)

// ── 上下文 ──
const context = computed(() => appStore.formGridContext)

// ── 流程图数据转换 ──
const flowNodes = computed(() => {
  if (!flowVersion.value?.graph?.nodes) return []
  return flowVersion.value.graph.nodes as unknown[]
})

const flowEdges = computed(() => {
  if (!flowVersion.value?.graph?.edges) return []
  return flowVersion.value.graph.edges as unknown[]
})

// ── 加载数据 ──
async function loadPreviewData(id: string) {
  loading.value = true
  error.value = ''

  try {
    const wf = await fetchWorkflowById(id)
    workflow.value = wf

    const [schemaDetail, version] = await Promise.all([
      fetchSchemaById(wf.formSchemaId),
      fetchLatestFlowVersion(wf.flowDefinitionId).catch(() => null),
    ])

    schema.value = schemaDetail.json
    flowVersion.value = version
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载工作流预览失败'
  } finally {
    loading.value = false
  }
}

function handleBack() {
  router.push('/workflows')
}

// ── 初始化 ──
onMounted(() => {
  if (workflowId.value) {
    loadPreviewData(workflowId.value)
  } else {
    error.value = '缺少工作流 ID'
    loading.value = false
  }
})
</script>

<template>
  <div :class="styles.page">
    <!-- 顶部导航 -->
    <div :class="styles.header">
      <div :class="styles.headerLeft">
        <button :class="styles.backBtn" title="返回" @click="handleBack">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span :class="styles.headerTitle">
          {{ workflow?.name ?? '工作流预览' }}
        </span>
        <t-tag
          v-if="workflow"
          :theme="workflow.status === 'published' ? 'success' : 'default'"
          size="small"
        >
          {{ workflow.status === 'published' ? '已发布' : workflow.status === 'archived' ? '已归档' : '草稿' }}
        </t-tag>
      </div>
      <div :class="styles.headerRight">
        <t-button size="small" @click="router.push(`/workflow/${workflowId}`)">
          编辑工作流
        </t-button>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" :class="styles.loading">
      <LoadingIcon :class="$style.spinner" :size="20" />
      <span>加载中...</span>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" :class="styles.errorState">
      <CloseCircleFilledIcon :size="48" style="color: var(--td-error-color)" />
      <p>{{ error }}</p>
      <t-button variant="outline" @click="handleBack">返回工作流列表</t-button>
    </div>

    <!-- 正常预览 -->
    <template v-else-if="workflow">
      <div :class="styles.body">
        <!-- 左侧：表单预览 -->
        <div :class="styles.leftPanel">
          <div :class="styles.panelHeader">
            <span :class="styles.panelTitle">表单预览</span>
            <t-button
              size="small"
              variant="text"
              theme="primary"
              @click="router.push(`/editor?id=${workflow.formSchemaId}`)"
            >
              编辑表单
            </t-button>
          </div>
          <div :class="styles.panelBody">
            <div :class="styles.formPreview">
              <WidgetRenderer
                :schema="schema"
                layout="flow"
                :readonly="true"
                :user="context.user"
                :request="context.request"
                :global="context.global"
              />
            </div>
          </div>
        </div>

        <!-- 右侧：流程图预览 -->
        <div :class="styles.rightPanel">
          <div :class="styles.panelHeader">
            <span :class="styles.panelTitle">流程图预览</span>
            <t-tag v-if="flowVersion" size="small" theme="default">
              {{ flowVersion.version }}
            </t-tag>
          </div>
          <div :class="styles.panelBody">
            <div :class="styles.flowPreview">
              <VueFlow
                v-if="flowNodes.length > 0"
                :nodes="flowNodes as any"
                :edges="flowEdges as any"
                :nodes-connectable="false"
                :nodes-draggable="false"
                :edges-updatable="false"
                :elements-selectable="false"
                :default-viewport="{ zoom: 0.8, x: 0, y: 0 }"
                fit-view-on-init
              >
                <template #node-user-task="nodeProps">
                  <div :class="'flow-node flow-node--task'">
                    <span>{{ nodeProps.data?.label || '审批节点' }}</span>
                  </div>
                </template>
                <template #node-service-task="nodeProps">
                  <div :class="'flow-node flow-node--service'">
                    <span>{{ nodeProps.data?.label || '服务节点' }}</span>
                  </div>
                </template>
                <template #node-start-event="nodeProps">
                  <div :class="'flow-node flow-node--start'">
                    <span>{{ nodeProps.data?.label || '开始' }}</span>
                  </div>
                </template>
                <template #node-end-event="nodeProps">
                  <div :class="'flow-node flow-node--end'">
                    <span>{{ nodeProps.data?.label || '结束' }}</span>
                  </div>
                </template>
                <Background :gap="20" :size="0.8" color="#d0d5dd" />
                <Controls />
              </VueFlow>
              <div v-else :class="styles.loading">
                <span>暂无流程图数据</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部：数据更新规则 -->
      <div :class="styles.rulesSection">
        <div :class="styles.rulesHeader" @click="rulesExpanded = !rulesExpanded">
          <div :class="styles.rulesHeaderLeft">
            <span :class="styles.rulesTitle">数据更新规则</span>
            <t-tag size="small" theme="default">
              {{ workflow.dataUpdateRules.length }} 条规则
            </t-tag>
          </div>
          <span :class="[styles.rulesToggle, rulesExpanded ? styles.rulesToggle + '--open' : '']">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </div>
        <div v-if="rulesExpanded" :class="styles.rulesBody">
          <div v-if="workflow.dataUpdateRules.length === 0" :class="styles.rulesEmpty">
            暂无数据更新规则
          </div>
          <template v-else>
            <div :class="styles.rulesTableHeader">
              <span>表单字段（源）</span>
              <span />
              <span>流程变量（目标）</span>
              <span>转换规则</span>
            </div>
            <div
              v-for="(rule, idx) in workflow.dataUpdateRules"
              :key="idx"
              :class="styles.rulesTableRow"
            >
              <span :class="styles.fieldValue">{{ rule.sourceField }}</span>
              <span :class="styles.rulesArrow">
                <ChevronRightIcon />
              </span>
              <span :class="styles.fieldValue">{{ rule.targetField }}</span>
              <span :class="styles.transformValue">
                {{ rule.transform || '-' }}
              </span>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style module>
.spinner {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

<style>
/* VueFlow 节点样式 — 使用全局样式因为 VueFlow 内部渲染不受 CSS Modules 作用域控制 */
.flow-node {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--td-text-color-primary);
  background: var(--td-bg-color-container);
  border: 1.5px solid var(--td-border-level-1-color);
  min-width: 80px;
  text-align: center;
  cursor: default;
}

.flow-node--task {
  border-color: var(--td-brand-color);
  background: var(--td-brand-color-light);
}

.flow-node--service {
  border-color: var(--td-success-color);
  background: var(--td-success-color-light);
}

.flow-node--start {
  border-color: var(--td-success-color);
  background: var(--td-success-color);
  color: #fff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  min-width: unset;
  padding: 0;
}

.flow-node--end {
  border-color: var(--td-error-color);
  background: var(--td-error-color);
  color: #fff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  min-width: unset;
  padding: 0;
}
</style>
