<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import AiMessage from './AiMessage.vue'
import type { AIMessage, AgentType } from '@/types'
import type { MessageEmbeddedCard } from './AiMessage.vue'

export interface AiChatPanelProps {
  title: string
  agent: AgentType
  messages: AIMessage[]
  loading?: boolean
  disabled?: boolean
  agentOptions?: Array<{ value: AgentType; label: string }>
}

const props = withDefaults(defineProps<AiChatPanelProps>(), {
  agentOptions: () => [
    { value: 'editor', label: 'Editor' },
    { value: 'flow', label: 'Flow' },
  ],
})

const emit = defineEmits<{
  send: [message: string, agent: AgentType]
  'clear-messages': []
  'card-primary-action': [messageIndex: number, cardIndex: number]
  'card-secondary-action': [messageIndex: number, cardIndex: number]
}>()

const inputText = ref('')
const selectedAgent = ref<AgentType>(props.agent)
const messagesRef = ref<HTMLElement>()

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
  return msg.role === 'user' ? 'You' : (props.agent === 'editor' ? 'Editor' : 'Flow')
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

watch(() => props.messages.length, scrollToBottom)

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text || props.disabled) return
  emit('send', text, selectedAgent.value)
  inputText.value = ''
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
          {{ agent === 'editor' ? 'Editor' : 'Flow' }}
        </span>
      </div>
      <div :class="$style.headerActions">
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

    <!-- Messages -->
    <div ref="messagesRef" :class="$style.messages">
      <!-- Empty state -->
      <div v-if="messages.length === 0 && !loading" :class="$style.emptyState">
        <div :class="$style.emptyIcon">&#x2726;</div>
        <div :class="$style.emptyTitle">开始一段新对话</div>
        <div :class="$style.emptySub">描述你想生成的表单、页面或流程</div>
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

    <!-- Floating Input Panel -->
    <div :class="$style.inputArea">
      <div :class="[$style.inputBox, { [$style.inputDisabled]: disabled }]">
        <textarea
          v-model="inputText"
          :class="$style.inputField"
          :placeholder="messages.length === 0 ? '描述你想要生成的内容...' : '继续描述...'"
          :disabled="disabled"
          rows="1"
          @keydown="handleKeydown"
        />
        <div :class="$style.inputFooter">
          <div :class="$style.inputHint">
            <kbd>Enter</kbd>&nbsp;发送&nbsp;&middot;&nbsp;<kbd>Shift+Enter</kbd>&nbsp;换行
          </div>
          <select
            v-model="selectedAgent"
            :class="$style.agentSelect"
            :disabled="disabled"
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
