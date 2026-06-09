<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import AiStepCard from './AiStepCard.vue'
import AiLoadingDots from './AiLoadingDots.vue'
import SchemaCard from './SchemaCard.vue'
import SchemaPreviewCard from './SchemaPreviewCard.vue'
import FlowCard from './FlowCard.vue'
import type { SchemaField } from './SchemaCard.vue'
import type { FlowNode } from './FlowCard.vue'
import type { StepData, Widget } from '@/types'

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
  /** 原始 Widget 数据，用于渲染器预览卡片 */
  schemaWidgets?: Widget[]
}

const props = defineProps<AiMessageProps>()

const emit = defineEmits<{
  'card-primary-action': [cardIndex: number]
  'card-secondary-action': [cardIndex: number]
  'open-json-drawer': []
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

// ---- Code block collapse state ----

const codeCollapsed = ref<Record<number, boolean>>({})

function toggleCodeCollapse(idx: number) {
  codeCollapsed.value[idx] = !codeCollapsed.value[idx]
}

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

// ---- Markdown rendering for text replies ----

import { marked } from 'marked'
import DOMPurify from 'dompurify'

function renderMarkdown(content: string): string {
  if (!content) return ''
  const rawHtml = marked.parse(content, { breaks: true }) as string
  return DOMPurify.sanitize(rawHtml)
}

function formatJson(content: string): string {
  try {
    const parsed = JSON.parse(content)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return content
  }
}

function copyCode(content: string) {
  navigator.clipboard.writeText(formatJson(content))
}

// ---- Split text and code blocks for better rendering ----

interface TextPart {
  type: 'text' | 'code'
  content: string
  language?: string
}

/**
 * 判断文本是否是 LLM 输出的多余总结性内容
 * 匹配 <schema> 标签后常见的总结模式
 */
function isRedundantSummary(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  const patterns = [
    /^(好的|已|我|现在|以上|这就是|这是|根据|基于)/,
    /^(表单|流程|Schema|JSON|数据)\s*(已|已经|已生成|已创建|已更新)/,
    /已(生成|创建|更新|完成|应用)(好|了)?/,
    /以上(就是|是)/,
    /请(查看|确认|检查|参考)/,
    /希望(这|这个)/,
  ]
  // 只匹配短文本（< 100 字符），长文本大概率是有意义的内容
  return trimmed.length < 100 && patterns.some(p => p.test(trimmed))
}

/**
 * 将 Markdown 内容拆分为文字和代码块两部分
 * 识别 ```json ... ``` 格式和 <schema>...</schema> 标签
 * 过滤 <schema> 标签后的多余总结文本
 */
function splitTextAndCodeBlocks(content: string): TextPart[] {
  const parts: TextPart[] = []

  // 同时匹配 ```json 代码块和 <schema> 标签
  const blockRegex = /(<schema>[\s\S]*?<\/schema>|```(\w+)?\n([\s\S]*?)```)/g
  let lastIndex = 0
  let match
  let hasSchemaTag = false

  while ((match = blockRegex.exec(content)) !== null) {
    // 添加代码块之前的文字
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index)
      if (textBefore.trim()) {
        parts.push({ type: 'text', content: textBefore })
      }
    }

    const fullMatch = match[0]

    // <schema> 标签
    if (fullMatch.startsWith('<schema>')) {
      const jsonContent = fullMatch.replace(/<\/?schema>/g, '').trim()
      parts.push({ type: 'code', content: jsonContent, language: 'json' })
      hasSchemaTag = true
    }
    // ```json 代码块
    else {
      const language = match[2] || 'json'
      const codeContent = match[3].trim()
      parts.push({ type: 'code', content: codeContent, language })
    }

    lastIndex = match.index + fullMatch.length
  }

  // 添加最后剩余的文字（如果有 <schema> 标签，过滤多余总结）
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex)
    if (remaining.trim()) {
      // 如果前面有 <schema> 标签，检查是否是多余总结
      if (hasSchemaTag && isRedundantSummary(remaining)) {
        // 过滤掉多余总结文本
      } else {
        parts.push({ type: 'text', content: remaining })
      }
    }
  }

  // 如果没有代码块，返回原始内容
  if (parts.length === 0) {
    parts.push({ type: 'text', content })
  }

  return parts
}

// ---- Derive step list from flat message data ----

const steps = computed<StepData[]>(() => {
  const result: StepData[] = []
  const now = new Date()

  // Step: thinking
  if (props.thinking) {
    result.push({
      type: 'thinking',
      title: '思考过程',
      content: props.thinking,
      status: 'done',
      timestamp: now,
      agent: props.agent,
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
        timestamp: now,
        agent: props.agent,
      })
    }
  }

  // Step: text reply — 拆分文字和 JSON 代码块
  if (renderedContentRef.value) {
    const parts = splitTextAndCodeBlocks(renderedContentRef.value)
    for (const part of parts) {
      if (part.type === 'text' && part.content.trim()) {
        result.push({
          type: 'text',
          title: '回复',
          content: part.content,
          status: 'done',
          timestamp: now,
          agent: props.agent,
        })
      } else if (part.type === 'code') {
        result.push({
          type: 'code',
          title: 'JSON 数据',
          content: part.content,
          status: 'done',
          timestamp: now,
          agent: props.agent,
        })
      }
    }
  }

  // Steps: embedded result cards（最后显示渲染结果）
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
        timestamp: now,
        agent: props.agent,
      })
    }
  }

  return result
})
</script>

<template>
  <div :class="[$style.msg, role === 'user' ? $style.msgUser : $style.msgAssistant]">
    <!-- Avatar -->
    <div :class="[$style.avatar, role === 'user' ? $style.avatarUser : $style.avatarAssistant]">
      <!-- User icon -->
      <svg v-if="role === 'user'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <!-- AI icon -->
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>

    <!-- Content area -->
    <div :class="$style.content">
      <!-- User message: bubble style -->
      <template v-if="role === 'user'">
        <div v-if="content" :class="$style.userBubble">{{ content }}</div>
      </template>

      <!-- Assistant message: step cards -->
      <template v-else>
        <!-- Loading placeholder when no steps yet -->
        <div v-if="loading && steps.length === 0" :class="$style.loadingPlaceholder">
          <AiLoadingDots />
        </div>

        <!-- Step card list -->
        <div v-if="steps.length > 0" :class="$style.stepList">
          <template v-for="(step, idx) in steps" :key="idx">
            <!-- Text reply: 直接渲染 Markdown，不包裹卡片 -->
            <div v-if="step.type === 'text' && step.content" :class="$style.markdownContent" v-html="renderMarkdown(step.content)" />

            <!-- Code/JSON: 用代码块展示，可折叠 -->
            <div v-else-if="step.type === 'code' && step.content" :class="$style.codeBlock">
              <div :class="$style.codeBlockHeader" @click="toggleCodeCollapse(idx)">
                <div :class="$style.codeBlockLeft">
                  <span :class="[$style.codeBlockArrow, { [$style.codeBlockArrowExpanded]: !codeCollapsed[idx] }]">▸</span>
                  <span :class="$style.codeBlockTitle">{{ step.title }}</span>
                </div>
                <button :class="$style.codeCopyBtn" @click.stop="copyCode(step.content)">复制</button>
              </div>
              <div v-if="!codeCollapsed[idx]" :class="$style.codeBlockBody">
                <pre :class="$style.codeContent"><code>{{ formatJson(step.content) }}</code></pre>
              </div>
            </div>

            <!-- Thinking/Tool/Result: 用卡片包裹 -->
            <AiStepCard
              v-else
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
              :timestamp="step.timestamp"
              :agent="step.agent"
              :is-last="idx === steps.length - 1"
              @primary-action="step.type === 'result' && emit('card-primary-action', 0)"
              @secondary-action="step.type === 'result' && emit('card-secondary-action', 0)"
            >
              <!-- Result card slot -->
              <template v-if="step.type === 'result' && cards">
                <!-- 有原始 Widget 数据时，使用渲染器预览卡片 -->
                <SchemaPreviewCard
                  v-if="schemaWidgets && schemaWidgets.length > 0"
                  :widgets="schemaWidgets"
                  :title="cards.find((c) => c.type === 'schema')?.title ?? '生成的表单'"
                  compact
                  @click="emit('open-json-drawer')"
                  @primary-action="emit('card-primary-action', 0)"
                  @secondary-action="emit('card-secondary-action', 0)"
                />
                <!-- fallback: 字段列表卡片 -->
                <template v-else>
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
                </template>
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
          </template>
        </div>

        <!-- Tip -->
        <div v-if="tip" :class="$style.tip">
          <svg :class="$style.tipIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span :class="$style.tipText">{{ tip }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style module src="./AiMessage.module.css" />
