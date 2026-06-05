<script setup lang="ts">
/**
 * AI 侧边抽屉视图
 *
 * 400px 宽单栏布局，嵌入 Editor / Flow 内使用。
 * 对齐 docs/designs/ui/ai/sidebar.html 设计。
 *
 * 与 AiChatView 的区别：
 * - 无对话列表、无预览面板
 * - Agent 可切换（支持同项目多 Agent）
 * - 有上下文条（Schema / Node 信息）
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useAiStore } from '@/stores/ai'
import { bridge } from '@/utils/bridge'
import { connect as connectSocket, emitAiApply, emitAiPublished } from '@schema-form/socket'
import AiMessage from '@/components/AiMessage.vue'
import type { AgentType, Widget, FlowGraph } from '@/types'
import type { MessageEmbeddedCard } from '@/components/AiMessage.vue'

const store = useAiStore()

// Agent 配置：从 URL query 读取初始值，支持切换
const params = new URLSearchParams(window.location.search)
const initialAgent = (params.get('agent') as AgentType) ?? 'editor'

// 可用 Agents 配置（根据项目类型）
const agentConfig: Record<string, { agents: AgentType[]; label: Record<AgentType, string> }> = {
  editor: {
    agents: ['editor', 'page'],
    label: { editor: 'Editor', page: 'Page' }
  },
  flow: {
    agents: ['flow'],
    label: { flow: 'Flow' }
  }
}

// 当前项目类型（从 URL 或默认）
const projectType = params.get('project') ?? initialAgent === 'flow' ? 'flow' : 'editor'
const config = agentConfig[projectType] ?? agentConfig.editor

// 当前选中的 Agent
const selectedAgent = ref<AgentType>(initialAgent)

// Agent 选项列表
const agentOptions = computed(() => config.agents.map(a => ({
  value: a,
  label: config.label[a]
})))

// Agent 标签颜色
const agentColors: Record<AgentType, string> = {
  editor: 'var(--ai-color-success, #26A036)',
  page: 'var(--ai-color-info, #4581E9)',
  flow: 'var(--ai-color-info, #4581E9)',
  auto: 'var(--ai-color-primary, #0060A2)',
  general: 'var(--ai-text-hint, #999999)'
}

// 上下文标签
const contextLabel = computed(() => {
  if (selectedAgent.value === 'editor') return 'Schema'
  if (selectedAgent.value === 'page') return 'Page'
  return 'Node'
})

const contextTag = computed(() => {
  const ctx = store.context
  if (ctx.schemaId) return ctx.schemaId
  if (ctx.nodeId) return ctx.nodeId
  return null
})

// 输入
const inputText = ref('')
const messagesRef = ref<HTMLElement>()

function scrollToBottom() {
  setTimeout(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  }, 50)
}

watch(() => store.messages.length, scrollToBottom)

function getDisplayCards(msg: typeof store.messages[0]): MessageEmbeddedCard[] | undefined {
  if (msg.schema) {
    return [{
      type: 'schema',
      title: '表单预览',
      fields: msg.schema.map((w) => ({
        icon: 'T',
        name: w.label ?? w.field ?? w.type,
        type: w.type,
        required: false,
      })),
      primaryAction: '应用到画布',
      secondaryAction: '继续优化',
    }]
  }
  if (msg.flow) {
    return [{
      type: 'flow',
      title: '流程预览',
      nodes: msg.flow.nodes.map((n) => ({
        label: n.data.label ?? n.data.bpmnType ?? n.id,
        type: (n.data.bpmnType === 'startEvent' ? 'start' : n.data.bpmnType === 'endEvent' ? 'end' : 'task') as 'start' | 'task' | 'end',
      })),
      primaryAction: '应用到画布',
      secondaryAction: '继续优化',
    }]
  }
  return undefined
}

function getLabel(msg: typeof store.messages[0]): string {
  return msg.role === 'user' ? 'You' : config.label[selectedAgent.value] ?? 'AI'
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || store.loading) return
  if (selectedAgent.value !== store.activeAgent) {
    store.switchAgent(selectedAgent.value)
  }
  await store.sendMessage(text)
  inputText.value = ''
}

function handleStop(): void {
  store.stopGeneration()
}

function handleCardAction(type: 'primary' | 'secondary') {
  if (type === 'primary') {
    handleApply()
  } else {
    // 在编辑器中打开（同时走 Socket + bridge 双通道）
    const payload = {
      schema: store.currentSchema,
      flow: store.currentFlow,
    }
    emitAiApply({
      type: store.currentSchema ? 'schema' : 'flow',
      payload: store.currentSchema ?? store.currentFlow!,
      conversationId: store.currentConversationId ?? undefined,
    })
    bridge.send('ai:open-in-editor', payload)
  }
}

async function handleApply() {
  // 通过 Socket 推送到宿主
  const isSchema = !!store.currentSchema
  emitAiApply({
    type: isSchema ? 'schema' : 'flow',
    payload: (isSchema ? store.currentSchema : store.currentFlow)!,
    conversationId: store.currentConversationId ?? undefined,
  })

  // 同时发布到服务端
  const publishId = await store.publishCurrent()
  if (publishId) {
    emitAiPublished({
      type: isSchema ? 'schema' : 'flow',
      id: publishId,
      publishId,
      conversationId: store.currentConversationId ?? undefined,
    })
    bridge.send('ai:published', {
      id: publishId,
      publishId,
      type: isSchema ? 'schema' : 'flow',
    })
  }
}

onMounted(() => {
  // 设置 agent
  store.switchAgent(selectedAgent.value)

  // 连接 Socket
  connectSocket()

  // 监听宿主上下文（standalone 模式 postMessage）
  bridge.on('ai:set-context', (payload) => {
    store.setContext(payload)
  })

  bridge.on('ai:current-schema', (payload) => {
    store.setCurrentSchema(payload)
  })

  // micro-app 模式：读取初始数据 + 监听 datachange
  // sandbox 模式下 __MICRO_APP_ENVIRONMENT__ 在脚本执行前才设置，延迟检测
  if (window.__MICRO_APP_ENVIRONMENT__ && window.microApp) {
    const initialData = window.microApp.getData()
    if (initialData) {
      handleHostData(initialData)
    }
    window.microApp.addDataListener(handleHostData)
  }
})

function handleHostData(data: Record<string, unknown>) {
  if (data.source) {
    store.setContext({ source: data.source as 'editor' | 'flow' | 'standalone' })
  }
  if (data.currentSchema && Array.isArray(data.currentSchema)) {
    store.setCurrentSchema(data.currentSchema as Widget[])
  }
  if (data.currentFlow && typeof data.currentFlow === 'object') {
    store.setCurrentFlow(data.currentFlow as FlowGraph)
  }
  if (data.schemaId) {
    store.setContext({ schemaId: data.schemaId as string })
  }
  if (data.flowId) {
    store.setContext({ flowId: data.flowId as string })
  }
  if (data.nodeId) {
    store.setContext({ nodeId: data.nodeId as string })
  }
  if (data.version) {
    store.setContext({ version: data.version as string })
  }
}
</script>

<template>
  <div :class="$style.panel">
    <!-- Header -->
    <div :class="$style.header">
      <div :class="$style.headerLeft">
        <div :class="$style.headerIcon">AI</div>
        <span :class="$style.headerTitle">智能助手</span>
      </div>
      <div :class="$style.headerRight">
        <div :class="$style.modelBadge">
          <span :class="$style.modelDot"></span>
          <span>DeepSeek</span>
        </div>
        <select
          v-model="selectedAgent"
          :class="$style.agentSelect"
          :disabled="store.loading"
        >
          <option
            v-for="opt in agentOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Context bar -->
    <div v-if="contextTag" :class="$style.contextBar">
      <span>{{ contextLabel }}:</span>
      <span :class="$style.contextTag">{{ contextTag }}</span>
    </div>

    <!-- Messages -->
    <div ref="messagesRef" :class="$style.messages">
      <!-- Empty state -->
      <div v-if="store.messages.length === 0 && !store.loading" :class="$style.emptyState">
        <div :class="$style.emptyIcon">&#x2726;</div>
        <div :class="$style.emptyTitle">描述你想生成的内容</div>
        <div :class="$style.emptySub">表单、列表页、页面...</div>
      </div>

      <!-- Message list -->
      <AiMessage
        v-for="(msg, idx) in store.messages"
        :key="idx"
        :role="msg.role === 'system' ? 'assistant' : msg.role"
        :label="getLabel(msg)"
        :agent="selectedAgent"
        :content="msg.content"
        :thinking="msg.thinking"
        :tip="msg.tip"
        :tool-calls="msg.toolCalls"
        :loading="store.loading && msg.role === 'assistant' && !msg.content && idx === store.messages.length - 1"
        :cards="getDisplayCards(msg)"
        @card-primary-action="handleCardAction('primary')"
        @card-secondary-action="handleCardAction('secondary')"
      />
    </div>

    <!-- Floating Input Panel -->
    <div :class="$style.inputArea">
      <div :class="[$style.inputBox, { [$style.inputDisabled]: store.loading }]">
        <textarea
          v-model="inputText"
          :class="$style.inputField"
          :placeholder="store.messages.length === 0 ? '描述你想要生成的内容...' : '继续描述...'"
          :disabled="store.loading"
          rows="1"
          @keydown="handleKeydown"
        />
        <div :class="$style.inputFooter">
          <div :class="$style.inputHint">
            <template v-if="store.loading">
              <span :class="$style.runningIndicator">
                <span :class="$style.runningDot"></span>
                <span :class="$style.runningDot"></span>
                <span :class="$style.runningDot"></span>
                运行中...
              </span>
            </template>
            <template v-else>
              <kbd>Enter</kbd>&nbsp;发送&nbsp;&middot;&nbsp;<kbd>Shift+Enter</kbd>&nbsp;换行
            </template>
          </div>
          <div :class="$style.inputActions">
            <select
              v-model="selectedAgent"
              :class="$style.agentSelect"
              :disabled="store.loading"
            >
              <option
                v-for="opt in agentOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
            <button
              v-if="store.loading"
              :class="$style.stopBtn"
              title="停止生成"
              @click="handleStop"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style module src="./AiSidebarView.module.css" />
