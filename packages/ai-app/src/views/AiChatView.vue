<script setup lang="ts">
/**
 * AI 对话主页面
 *
 * 三栏布局：对话列表(240px) | 聊天区(flex:1) | 预览面板(400px)
 * 使用 AiConversationList / AiChatPanel / AiPreviewPanel 组件。
 */

import { onMounted, computed } from 'vue'
import { useAiStore } from '@/stores/ai'
import { bridge } from '@/utils/bridge'
import type { AgentType } from '@/types'
import { storeToRefs } from 'pinia'
import AiConversationList from '@/components/AiConversationList.vue'
import AiChatPanel from '@/components/AiChatPanel.vue'
import AiPreviewPanel from '@/components/AiPreviewPanel.vue'
import type { PreviewSchemaData, PreviewFlowData, PreviewTab } from '@/components/AiPreviewPanel.vue'

const store = useAiStore()
const { messages, loading, currentSchema, currentFlow, activeAgent, conversations, currentConversationId, taskChain, taskChainIndex } =
  storeToRefs(store)

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
  }
})

const jsonString = computed(() => {
  if (currentSchema.value) return JSON.stringify(currentSchema.value, null, 2)
  if (currentFlow.value) return JSON.stringify(currentFlow.value, null, 2)
  return undefined
})

// ---- Event handlers ----

async function handleSend(message: string, agent: AgentType): Promise<void> {
  if (agent !== activeAgent.value) {
    store.switchAgent(agent)
  }
  await store.sendMessage(message)
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

function handlePrimaryAction(): void {
  handlePublish()
}

function handleSecondaryAction(): void {
  bridge.send('ai:open-in-editor', {
    schema: currentSchema.value,
    flow: currentFlow.value,
  })
}

async function handlePublish(): Promise<void> {
  const publishId = await store.publishCurrent()
  if (publishId) {
    bridge.send('ai:published', {
      id: publishId,
      publishId,
      type: currentSchema.value ? 'schema' : 'flow',
    })
  }
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
        <div :class="$style.topbarLogo">
          <div :class="$style.topbarIcon">AI</div>
          <span :class="$style.topbarBrand">智能助手</span>
        </div>
        <div :class="$style.topbarDivider"></div>
        <div :class="$style.topbarNav">
          <span :class="[$style.topbarNavItem, $style.topbarNavItemActive]">对话</span>
          <span :class="$style.topbarNavItem">历史</span>
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
        @send="handleSend"
        @clear-messages="handleClearMessages"
        @card-primary-action="handlePrimaryAction"
        @card-secondary-action="handleSecondaryAction"
      />

      <!-- 右侧：预览面板 -->
      <AiPreviewPanel
        :tabs="previewTabs"
        :schema-data="schemaData"
        :flow-data="flowData"
        :json-string="jsonString"
        primary-action="确认发布"
        secondary-action="在编辑器中打开"
        @primary-action="handlePrimaryAction"
        @secondary-action="handleSecondaryAction"
      />
    </div>
  </div>
</template>

<style module src="./AiChatView.module.css" />
