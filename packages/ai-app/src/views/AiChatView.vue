<script setup lang="ts">
/**
 * AI 对话主页面
 *
 * 三栏布局：对话列表(240px) | 聊天区(flex:1) | 预览面板(400px)
 * 使用 AiConversationList / AiChatPanel / AiPreviewPanel 组件。
 */

import { ref, onMounted, computed } from 'vue'
import { useAiStore } from '@/stores/ai'
import { bridge } from '@/utils/bridge'
import type { AgentType, ChatSettings, MentionReference, RagSearchResult } from '@/types'
import { storeToRefs } from 'pinia'
import { ElDrawer, ElMessage, ElButton, ElTooltip } from 'element-plus'
import { HomeFilled } from '@element-plus/icons-vue'
import { getAppUrl } from '@schema-form/micro-app/config'
import AiConversationList from '@/components/AiConversationList.vue'
import AiChatPanel from '@/components/AiChatPanel.vue'
import AiPreviewPanel from '@/components/AiPreviewPanel.vue'
import AiChatSettings from '@/components/AiChatSettings.vue'
import SchemaDiffPanel from '@/components/SchemaDiffPanel.vue'
import type { PreviewSchemaData, PreviewFlowData, PreviewTab } from '@/components/AiPreviewPanel.vue'

const store = useAiStore()
const { messages, loading, currentSchema, currentFlow, activeAgent, conversations, currentConversationId, taskChain, taskChainIndex, currentDiff, schemaUpdateDescription, sseStatus, retryCount, MAX_AUTO_RETRIES, chatSettings, ragSearchResults, ragSearching, ragContext } =
  storeToRefs(store)

// ---- 防止发布按钮重复调用 ----
const isPublishing = ref(false)

// ---- Settings dialog ----
const settingsVisible = ref(false)

function handleOpenSettings(): void {
  settingsVisible.value = true
}

function handleUpdateSettingsVisible(val: boolean): void {
  settingsVisible.value = val
}

function handleSaveSettings(settings: ChatSettings): void {
  store.updateChatSettings(settings)
}

// ---- JSON Drawer ----
const jsonDrawerVisible = ref(false)

function handleOpenJsonDrawer(): void {
  jsonDrawerVisible.value = true
}

const jsonDrawerContent = computed(() => {
  if (currentSchema.value) {
    return JSON.stringify(currentSchema.value, null, 2)
  }
  if (currentFlow.value) {
    return JSON.stringify(currentFlow.value, null, 2)
  }
  return '{}'
})

const jsonDrawerTitle = computed(() => {
  if (currentSchema.value) return 'Schema JSON 结构'
  if (currentFlow.value) return 'Flow JSON 结构'
  return 'JSON 结构'
})

// ---- 右侧预览面板折叠 ----
const rightPanelCollapsed = ref(false)

// ---- Preview data ----

const previewTabs = computed<PreviewTab[]>(() => {
  const tabs: PreviewTab[] = ['json']
  if (currentSchema.value) tabs.unshift('schema')
  if (currentFlow.value) tabs.unshift('flow')
  return tabs
})

const schemaData = computed<PreviewSchemaData | undefined>(() => {
  if (!currentSchema.value) return undefined
  return {
    title: '生成的表单',
    fields: currentSchema.value.map((w) => ({
      icon: w.type?.charAt(0)?.toUpperCase() ?? '?',
      name: w.label ?? w.field ?? w.type,
      type: w.type,
    })),
  }
})

const flowData = computed<PreviewFlowData | undefined>(() => {
  if (!currentFlow.value) return undefined
  return {
    title: '生成的流程',
    nodes: currentFlow.value.nodes.map((n) => ({
      label: n.data.label ?? n.data.bpmnType ?? n.id,
      type: (n.data.bpmnType === 'startEvent' ? 'start' : n.data.bpmnType === 'endEvent' ? 'end' : 'task') as 'start' | 'task' | 'end',
    })),
    graph: currentFlow.value,
  }
})

const jsonString = computed(() => {
  if (currentSchema.value) return JSON.stringify(currentSchema.value, null, 2)
  if (currentFlow.value) return JSON.stringify(currentFlow.value, null, 2)
  return undefined
})

// ---- Event handlers ----

async function handleSend(message: string, agent: AgentType, mentions?: MentionReference[]): Promise<void> {
  if (agent !== activeAgent.value) {
    store.switchAgent(agent)
  }
  await store.sendMessage(message, mentions)
}

function handleStop(): void {
  store.stopGeneration()
}

function handleRetry(): void {
  store.retryLastMessage()
}

function handleSelectConversation(id: string): void {
  store.loadConversation(id)
}

function handleNewConversation(): void {
  store.clearConversation()
}

function handleDeleteConversation(id: string): void {
  store.removeConversation(id)
}

function handleClearMessages(): void {
  store.clearConversation()
}

function handleUndoSchema(): void {
  store.undoLastSchemaUpdate()
}

function handleDismissDiff(): void {
  store.clearDiff()
}

function handlePrimaryAction(): void {
  handlePublish()
}

async function handleSecondaryAction(): Promise<void> {
  if (isPublishing.value) return
  isPublishing.value = true
  try {
    const result = await store.publishCurrent()
    if (!result) {
      ElMessage.warning('没有可发布的内容')
      return
    }

    // micro-app 嵌入模式：通过 bridge 通知宿主
    if (window.__MICRO_APP_ENVIRONMENT__) {
      bridge.send('ai:open-in-editor', {
        schema: currentSchema.value,
        flow: currentFlow.value,
        id: result.id,
        type: result.type,
      })
      return
    }

    // standalone 模式：先发布再跳转到对应编辑器
    const url = result.type === 'flow'
      ? `/flow/?id=${result.id}`
      : `/editor/?id=${result.id}`
    window.open(url, '_blank')
  } catch {
    ElMessage.error('发布失败，请稍后重试')
  } finally {
    isPublishing.value = false
  }
}

async function handlePublish(): Promise<void> {
  if (isPublishing.value) return
  isPublishing.value = true
  try {
    const result = await store.publishCurrent()
    if (result) {
      ElMessage.success(result.type === 'schema' ? '表单发布成功' : '流程发布成功')
      bridge.send('ai:published', {
        id: result.id,
        publishId: result.publishId,
        type: result.type,
      })
    } else {
      ElMessage.warning('没有可发布的内容')
    }
  } catch {
    ElMessage.error('发布失败，请稍后重试')
  } finally {
    isPublishing.value = false
  }
}

async function handleApplyToEditor(widgetIds?: string[]): Promise<void> {
  if (isPublishing.value) return
  isPublishing.value = true
  try {
    const result = await store.publishCurrent()
    if (result) {
      ElMessage.success('已应用到编辑器')
      bridge.send('ai:open-in-editor', {
        id: result.id,
        publishId: result.publishId,
        type: result.type,
        widgetIds,
      })
      const url = result.type === 'flow'
        ? `/flow/?id=${result.id}`
        : `/editor/?id=${result.id}`
      window.open(url, '_blank')
    }
  } catch {
    ElMessage.error('应用失败，请稍后重试')
  } finally {
    isPublishing.value = false
  }
}

// ---- RAG ----

function handleRagSearch(query: string): void {
  store.searchRagAction(query).catch(() => {
    ElMessage.error('RAG 搜索失败，请稍后重试')
  })
}

function handleRagSelect(item: RagSearchResult): void {
  store.addRagContext(item)
}

function handleRagRemove(id: string): void {
  store.removeRagContext(id)
}

function goToPortal(): void {
  window.location.href = getAppUrl('portal', import.meta.env.DEV)
}

// ---- Message actions ----

function handleCopyMessage(messageIndex: number): void {
  const msg = messages.value[messageIndex]
  if (msg?.content) {
    navigator.clipboard.writeText(msg.content)
    ElMessage.success('已复制到剪贴板')
  }
}

function handleRegenerateMessage(messageIndex: number): void {
  store.regenerateMessage(messageIndex)
}

function handleMessageFeedback(messageIndex: number, type: 'positive' | 'negative'): void {
  store.submitFeedback(messageIndex, type)
}

// ---- Bridge ----

onMounted(() => {
  store.loadConversations()

  bridge.on('ai:set-context', (payload) => {
    store.setContext(payload)
  })

  bridge.on('ai:current-schema', (payload) => {
    store.setCurrentSchema(payload)
  })
})
</script>

<template>
  <div :class="$style.page">
    <!-- 顶栏 -->
    <div :class="$style.topbar">
      <div :class="$style.topbarLeft">
        <ElTooltip content="返回门户首页" placement="bottom">
          <button :class="$style.portalBtn" title="返回门户" @click="goToPortal">
            <el-icon :size="14"><HomeFilled /></el-icon>
          </button>
        </ElTooltip>
        <div :class="$style.topbarDivider" />
        <span :class="$style.appName">AI 助手</span>
        <div :class="$style.topbarDivider" />
        <div :class="$style.topbarLogo">
          <div :class="$style.topbarIcon">AI</div>
          <span :class="$style.topbarBrand">智能助手</span>
        </div>
      </div>
      <div :class="$style.topbarRight">
        <div :class="$style.modelBadge">
          <span :class="$style.modelDot"></span>
          <span :class="$style.modelName">DeepSeek</span>
        </div>
        <el-button type="primary" size="small" @click="handleNewConversation">
          + 新对话
        </el-button>
      </div>
    </div>

    <!-- 主体三栏 -->
    <div :class="$style.body">
      <!-- 左侧：对话列表 -->
      <AiConversationList
        :conversations="conversations"
        :active-id="currentConversationId ?? undefined"
        @select="handleSelectConversation"
        @new-conversation="handleNewConversation"
        @delete="handleDeleteConversation"
      />

      <!-- 中间：聊天区 -->
      <AiChatPanel
        :title="conversations.find((c) => c.id === currentConversationId)?.title ?? '新对话'"
        :agent="activeAgent"
        :messages="messages"
        :loading="loading"
        :task-chain="taskChain"
        :task-chain-index="taskChainIndex"
        :sse-status="sseStatus"
        :retry-count="retryCount"
        :max-retries="MAX_AUTO_RETRIES"
        :rag-search-results="ragSearchResults"
        :rag-searching="ragSearching"
        :rag-context="ragContext"
        @send="handleSend"
        @stop="handleStop"
        @retry="handleRetry"
        @clear-messages="handleClearMessages"
        @card-primary-action="handlePrimaryAction"
        @card-secondary-action="handleSecondaryAction"
        @open-settings="handleOpenSettings"
        @rag-search="handleRagSearch"
        @rag-select="handleRagSelect"
        @rag-remove="handleRagRemove"
        @open-json-drawer="handleOpenJsonDrawer"
        @retry-tool="(mi, tci) => store.retryToolCall(mi, tci)"
        @copy-message="handleCopyMessage"
        @regenerate-message="handleRegenerateMessage"
        @message-feedback="handleMessageFeedback"
      />

      <!-- 右侧：预览面板 -->
      <div :class="[$style.rightPanel, { [$style.collapsed]: rightPanelCollapsed }]">
        <!-- Diff 面板（增量更新时显示） -->
        <SchemaDiffPanel
          v-if="currentDiff"
          :diff="currentDiff"
          :description="schemaUpdateDescription"
          @undo="handleUndoSchema"
          @dismiss="handleDismissDiff"
        />

        <AiPreviewPanel
        :tabs="previewTabs"
        :schema-data="schemaData"
        :flow-data="flowData"
        :schema-widgets="currentSchema ?? undefined"
        :json-string="jsonString"
        primary-action="确认发布"
        secondary-action="在编辑器中打开"
        @primary-action="handlePrimaryAction"
        @secondary-action="handleSecondaryAction"
        @apply-to-editor="handleApplyToEditor"
      />
      </div>

    </div>

    <!-- 折叠/展开切换按钮（放在 body 外部，避免被 overflow: hidden 裁剪） -->
    <ElButton :class="[$style.panelToggle, { [$style.panelToggleCollapsed]: rightPanelCollapsed }]" link @click="rightPanelCollapsed = !rightPanelCollapsed">
      {{ rightPanelCollapsed ? '◀' : '▶' }}
    </ElButton>

    <!-- Settings Dialog -->
    <AiChatSettings
      :visible="settingsVisible"
      :settings="chatSettings"
      @update:visible="handleUpdateSettingsVisible"
      @update:settings="handleSaveSettings"
    />

    <!-- JSON 结构抽屉 -->
    <ElDrawer
      v-model="jsonDrawerVisible"
      :title="jsonDrawerTitle"
      direction="rtl"
      size="420px"
      :z-index="2000"
    >
      <div :class="$style.jsonDrawer">
        <pre :class="$style.jsonContent">{{ jsonDrawerContent }}</pre>
      </div>
    </ElDrawer>
  </div>
</template>

<style module src="./AiChatView.module.css" />
