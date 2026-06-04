<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import AiStepCard from './AiStepCard.vue'
import AiLoadingDots from './AiLoadingDots.vue'
import SchemaCard from './SchemaCard.vue'
import FlowCard from './FlowCard.vue'
import type { SchemaField } from './SchemaCard.vue'
import type { FlowNode } from './FlowCard.vue'
import type { StepData } from '@/types'

export type MessageRole = 'user' | 'assistant'

export interface MessageSchemaCard {
  type: 'schema'
  title: string
  fields: SchemaField[]
  primaryAction?: string
  secondaryAction?: string
}

export interface MessageFlowCard {
  type: 'flow'
  title: string
  nodes: FlowNode[]
  primaryAction?: string
  secondaryAction?: string
}

export type MessageEmbeddedCard = MessageSchemaCard | MessageFlowCard

export interface ToolCallDisplay {
  name: string
  arguments: Record<string, unknown>
  result?: unknown
  error?: string
}

export interface AiMessageProps {
  role: MessageRole
  /** label shown above the message, e.g. "You", "Editor", "Flow" */
  label: string
  /** agent type for coloring — only used when role is 'assistant' */
  agent?: 'editor' | 'flow' | 'page' | 'auto' | 'general'
  content?: string
  thinking?: string
  tip?: string
  toolCalls?: ToolCallDisplay[]
  loading?: boolean
  cards?: MessageEmbeddedCard[]
}

const props = defineProps<AiMessageProps>()

const emit = defineEmits<{
  'card-primary-action': [cardIndex: number]
  'card-secondary-action': [cardIndex: number]
}>()

// ---- F2: rAF-batched content for streaming ----

/** Buffered content that only updates at animation frame cadence */
const renderedContentRef = ref('')
let rafId = 0
let latestContent = ''

function flushContent() {
  rafId = 0
  renderedContentRef.value = latestContent
}

watch(() => props.content, (newContent) => {
  latestContent = newContent ?? ''
  if (!rafId) {
    rafId = requestAnimationFrame(flushContent)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
})

// ---- Tool name display map ----

const TOOL_NAME_MAP: Record<string, string> = {
  search_schemas: '搜索表单',
  get_schema_detail: '获取表单详情',
  search_published_schemas: '搜索已发布表单',
  get_widget_catalogue: '查询组件目录',
  search_widgets_by_keyword: '关键词匹配搜索',
  validate_schema: '校验 Schema',
  rag_search: '向量语义搜索',
  generate_schema: '生成表单',
  search_flows: '搜索流程',
  get_flow_detail: '获取流程详情',
  search_users: '搜索用户',
  validate_flow: '校验流程',
}

function formatToolName(name: string): string {
  return TOOL_NAME_MAP[name] ?? name
}

// ---- Derive step list from flat message data ----

const steps = computed<StepData[]>(() => {
  const result: StepData[] = []

  // Step: thinking
  if (props.thinking) {
    result.push({
      type: 'thinking',
      title: '思考过程',
      content: props.thinking,
      status: 'done',
    })
  }

  // Steps: tool calls
  if (props.toolCalls && props.toolCalls.length > 0) {
    for (const tc of props.toolCalls) {
      const hasError = !!tc.error
      const hasResult = tc.result !== undefined
      const status = hasError ? 'error' : hasResult ? 'done' : 'running'

      result.push({
        type: hasError ? 'tool_error' : 'tool_call',
        title: formatToolName(tc.name),
        status,
        toolName: tc.name,
        toolDisplayName: formatToolName(tc.name),
        toolResult: tc.result,
        toolArguments: tc.arguments,
        error: tc.error,
      })
    }
  }

  // Steps: embedded result cards
  if (props.cards && props.cards.length > 0) {
    for (const card of props.cards) {
      result.push({
        type: 'result',
        title: card.title,
        status: 'done',
        cardType: card.type,
        cardTitle: card.title,
        primaryAction: card.primaryAction,
        secondaryAction: card.secondaryAction,
      })
    }
  }

  // Step: text reply
  if (renderedContentRef.value) {
    result.push({
      type: 'text',
      title: '回复',
      content: renderedContentRef.value,
      status: 'done',
    })
  }

  return result
})
</script>

<template>
  <div :class="$style.msg">
    <span :class="[$style.label, role === 'user' ? $style.user : $style.ai]">
      {{ label }}
    </span>

    <!-- User message: plain content -->
    <template v-if="role === 'user'">
      <div :class="$style.body">
        <div v-if="content" :class="$style.plainText">{{ content }}</div>
      </div>
    </template>

    <!-- Assistant message: step cards -->
    <template v-else>
      <!-- Loading placeholder when no steps yet -->
      <div v-if="loading && steps.length === 0" :class="$style.loadingPlaceholder">
        <AiLoadingDots />
      </div>

      <!-- Step card list -->
      <div v-if="steps.length > 0" :class="$style.stepList">
        <AiStepCard
          v-for="(step, idx) in steps"
          :key="idx"
          :index="idx + 1"
          :type="step.type"
          :title="step.title"
          :content="step.content"
          :status="step.status"
          :tool-name="step.toolName"
          :tool-display-name="step.toolDisplayName"
          :tool-result="step.toolResult"
          :tool-arguments="step.toolArguments"
          :error="step.error"
          :card-type="step.cardType"
          :card-title="step.cardTitle"
          :primary-action="step.primaryAction"
          :secondary-action="step.secondaryAction"
          :is-last="idx === steps.length - 1"
          @primary-action="step.type === 'result' && emit('card-primary-action', 0)"
          @secondary-action="step.type === 'result' && emit('card-secondary-action', 0)"
        >
          <!-- Result card slot -->
          <template v-if="step.type === 'result' && cards">
            <SchemaCard
              v-for="(card, cIdx) in cards.filter((c) => c.type === 'schema')"
              :key="'s' + cIdx"
              :title="card.title"
              :fields="card.fields"
              :primary-action="card.primaryAction"
              :secondary-action="card.secondaryAction"
              compact
              @primary-action="emit('card-primary-action', cIdx)"
              @secondary-action="emit('card-secondary-action', cIdx)"
            />
            <FlowCard
              v-for="(card, cIdx) in cards.filter((c) => c.type === 'flow')"
              :key="'f' + cIdx"
              :title="card.title"
              :nodes="card.nodes"
              :primary-action="card.primaryAction"
              :secondary-action="card.secondaryAction"
              compact
              @primary-action="emit('card-primary-action', cIdx)"
              @secondary-action="emit('card-secondary-action', cIdx)"
            />
          </template>
        </AiStepCard>
      </div>

      <!-- Tip -->
      <div v-if="tip" :class="$style.tip">
        <span :class="$style.tipIcon">&#x1F4A1;</span>
        <span>{{ tip }}</span>
      </div>
    </template>
  </div>
</template>

<style module src="./AiMessage.module.css" />
