<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import AiMessage from './AiMessage.vue'
import TaskChainBar from './TaskChainBar.vue'
import AiMentionInput from './AiMentionInput.vue'
import type { AIMessage, AgentType, TaskChainStep, SSEConnectionStatus, MentionReference } from '@/types'
import type { MessageEmbeddedCard } from './AiMessage.vue'

export interface AiChatPanelProps {
  title: string
  agent: AgentType
  messages: AIMessage[]
  loading?: boolean
  disabled?: boolean
  agentOptions?: Array<{ value: AgentType; label: string }>
  taskChain?: TaskChainStep[]
  taskChainIndex?: number
  /** SSE 连接状态 */
  sseStatus?: SSEConnectionStatus
  /** 当前自动重试次数 */
  retryCount?: number
  /** 最大自动重试次数 */
  maxRetries?: number
}

const props = withDefaults(defineProps<AiChatPanelProps>(), {
  agentOptions: () => [
    { value: 'auto', label: 'Auto' },
    { value: 'editor', label: 'Editor' },
    { value: 'flow', label: 'Flow' },
  ],
  sseStatus: 'idle',
  retryCount: 0,
  maxRetries: 3,
})

const emit = defineEmits<{
  send: [message: string, agent: AgentType, mentions?: MentionReference[]]
  stop: []
  retry: []
  'clear-messages': []
  'card-primary-action': [messageIndex: number, cardIndex: number]
  'card-secondary-action': [messageIndex: number, cardIndex: number]
  'open-settings': []
}>()

const selectedAgent = ref<AgentType>('auto')
const messagesRef = ref<HTMLElement>()

/** F3: 空状态引导 prompt 列表 */
const starterPrompts = [
  { icon: '&#x1F4DD;', text: '帮我生成一个用户注册表单', agent: 'editor' as AgentType },
  { icon: '&#x1F4CB;', text: '创建一个订单审批流程', agent: 'flow' as AgentType },
  { icon: '&#x1F50D;', text: '搜索已有的表单模板', agent: 'auto' as AgentType },
  { icon: '&#x2699;', text: '设计一个系统配置页面', agent: 'editor' as AgentType },
]

/** Transform store AIMessage into display-oriented props for AiMessage component */
function getDisplayCards(msg: AIMessage): MessageEmbeddedCard[] | undefined {
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
      primaryAction: '确认发布',
      secondaryAction: '修改',
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
      secondaryAction: '修改',
    }]
  }
  return undefined
}

function getLabel(msg: AIMessage): string {
  if (msg.role === 'user') return 'You'
  if (msg.agent) {
    const labels: Record<string, string> = {
      editor: 'Editor',
      flow: 'Flow',
      general: 'AI',
    }
    return labels[msg.agent] ?? 'AI'
  }
  if (props.agent === 'auto') return 'AI'
  return props.agent === 'editor' ? 'Editor' : 'Flow'
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

watch(() => props.messages.length, scrollToBottom)

function handleMentionSend(text: string, mentions?: MentionReference[]): void {
  if (!text || props.disabled) return
  emit('send', text, selectedAgent.value, mentions)
}

function handleCardAction(
  type: 'primary' | 'secondary',
  msgIdx: number,
  cardIdx: number,
) {
  if (type === 'primary') {
    emit('card-primary-action', msgIdx, cardIdx)
  } else {
    emit('card-secondary-action', msgIdx, cardIdx)
  }
}
</script>

<template>
  <div :class="$style.chat">
    <!-- Header -->
    <div :class="$style.header">
      <div :class="$style.headerLeft">
        <span :class="$style.title">{{ title }}</span>
        <span :class="[$style.roleBadge, $style[agent]]">
          {{ agent === 'auto' ? 'Auto' : agent === 'editor' ? 'Editor' : 'Flow' }}
        </span>
        <!-- SSE 连接状态指示器 -->
        <span
          v-if="sseStatus === 'connecting'"
          :class="[$style.connStatus, $style.connConnecting]"
        >
          <span :class="$style.connDot" />
          连接中
        </span>
        <span
          v-else-if="sseStatus === 'reconnecting'"
          :class="[$style.connStatus, $style.connReconnecting]"
        >
          <span :class="$style.connDot" />
          重连中 {{ retryCount }}/{{ maxRetries }}
        </span>
        <span
          v-else-if="sseStatus === 'disconnected'"
          :class="[$style.connStatus, $style.connDisconnected]"
        >
          <span :class="$style.connDot" />
          已断开
        </span>
      </div>
      <div :class="$style.headerActions">
        <button
          :class="$style.actionBtn"
          title="对话设置"
          @click="emit('open-settings')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          :class="$style.actionBtn"
          title="清空对话"
          @click="emit('clear-messages')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Task Chain Bar -->
    <TaskChainBar
      v-if="taskChain && taskChain.length > 1"
      :steps="taskChain"
      :current-index="taskChainIndex ?? 0"
    />

    <!-- Messages -->
    <div ref="messagesRef" :class="$style.messages">
      <!-- Empty state with starter prompts -->
      <div v-if="messages.length === 0 && !loading" :class="$style.emptyState">
        <div :class="$style.emptyIcon">&#x2726;</div>
        <div :class="$style.emptyTitle">开始一段新对话</div>
        <div :class="$style.emptySub">描述你想生成的表单、页面或流程</div>
        <div :class="$style.promptGrid">
          <button
            v-for="(prompt, idx) in starterPrompts"
            :key="idx"
            :class="$style.promptCard"
            @click="emit('send', prompt.text, prompt.agent)"
          >
            <span :class="$style.promptIcon" v-html="prompt.icon" />
            <span :class="$style.promptText">{{ prompt.text }}</span>
          </button>
        </div>
      </div>

      <!-- Message list -->
      <AiMessage
        v-for="(msg, idx) in messages"
        :key="idx"
        :role="msg.role === 'system' ? 'assistant' : msg.role"
        :label="getLabel(msg)"
        :agent="agent"
        :content="msg.content"
        :thinking="msg.thinking"
        :tip="msg.tip"
        :tool-calls="msg.toolCalls"
        :loading="loading && msg.role === 'assistant' && !msg.content && idx === messages.length - 1"
        :cards="getDisplayCards(msg)"
        @card-primary-action="(ci) => handleCardAction('primary', idx, ci)"
        @card-secondary-action="(ci) => handleCardAction('secondary', idx, ci)"
      />
    </div>

    <!-- Retry Banner (SSE disconnected) -->
    <div v-if="sseStatus === 'disconnected'" :class="$style.retryBanner">
      <span :class="$style.retryBannerText">连接已断开，请重新发送</span>
      <button :class="$style.retryBannerBtn" @click="emit('retry')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        重试
      </button>
    </div>

    <!-- Floating Input Panel -->
    <div :class="$style.inputArea">
      <div :class="[$style.inputBox, { [$style.inputDisabled]: disabled }]">
        <AiMentionInput
          :disabled="disabled"
          :loading="loading"
          :placeholder="messages.length === 0 ? '描述你想要生成的内容...' : '继续描述...'"
          @send="handleMentionSend"
        />
        <div :class="$style.inputFooter">
          <div :class="$style.inputHint">
            <template v-if="loading">
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
          <select
            v-model="selectedAgent"
            :class="$style.agentSelect"
            :disabled="disabled || loading"
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
    </div>
  </div>
</template>

<style module src="./AiChatPanel.module.css" />
