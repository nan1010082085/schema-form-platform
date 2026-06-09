<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { StepType, StepStatus } from '@/types'

export interface AiStepCardProps {
  /** 步骤序号（从 1 开始） */
  index: number
  /** 步骤类型 */
  type: StepType
  /** 步骤标题 */
  title: string
  /** 步骤内容（thinking / text / tool 结果文本） */
  content?: string
  /** 步骤状态 */
  status?: StepStatus
  /** 工具名称（tool_call / tool_error） */
  toolName?: string
  /** 工具显示名称 */
  toolDisplayName?: string
  /** 工具调用结果 */
  toolResult?: unknown
  /** 工具调用参数 */
  toolArguments?: Record<string, unknown>
  /** 错误信息 */
  error?: string
  /** 嵌入卡片类型 */
  cardType?: 'schema' | 'flow'
  /** 嵌入卡片标题 */
  cardTitle?: string
  /** 主操作按钮文本 */
  primaryAction?: string
  /** 次操作按钮文本 */
  secondaryAction?: string
  /** 是否是最后一个步骤（隐藏连接线） */
  isLast?: boolean
  /** 步骤时间戳 */
  timestamp?: Date
  /** 智能体类型 */
  agent?: 'editor' | 'flow' | 'page' | 'auto' | 'general'
}

const props = withDefaults(defineProps<AiStepCardProps>(), {
  status: 'done',
  isLast: false,
})

defineEmits<{
  'primary-action': []
  'secondary-action': []
}>()

const SEARCH_TOOL_NAMES = new Set([
  'search_schemas', 'search_published_schemas', 'fuzzy_search_schemas',
  'search_flows', 'search_users', 'get_widget_catalogue',
])

const agentLabels: Record<string, string> = {
  editor: 'Editor 专家',
  flow: 'Flow 专家',
  page: 'Page 专家',
  general: '通用助手',
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// 默认展开所有步骤，用户可手动折叠
const collapsed = ref(false)

const hasHeader = computed(() =>
  props.type === 'thinking' || props.type === 'tool_call' || props.type === 'tool_error',
)

const isRunning = computed(() => props.status === 'running')
const isError = computed(() => props.status === 'error' || props.type === 'tool_error')
const isDone = computed(() => props.status === 'done' && !isError.value)

const renderedContent = computed(() => {
  if (!props.content) return ''
  const rawHtml = marked.parse(props.content, { breaks: true }) as string
  return DOMPurify.sanitize(rawHtml)
})

const hasToolDetails = computed(() =>
  (props.type === 'tool_call' || props.type === 'tool_error') &&
  props.toolArguments && Object.keys(props.toolArguments).length > 0,
)

const hasToolResult = computed(() =>
  props.type === 'tool_call' && props.toolResult !== undefined,
)

const toolResultSummary = computed(() => {
  if (!props.toolResult || typeof props.toolResult !== 'object') return null
  const r = props.toolResult as Record<string, unknown>
  return typeof r.summary === 'string' ? r.summary : null
})

const compactResult = computed(() => {
  if (!props.toolResult || typeof props.toolResult !== 'object') return null
  const r = props.toolResult as Record<string, unknown>
  if (!SEARCH_TOOL_NAMES.has(props.toolName ?? '')) return null
  if (r.error) return null

  const data = r.data as Record<string, unknown> | undefined
  if (!data) return null

  const items = (data.schemas ?? data.flows ?? data.users ?? data.widgets ?? []) as Array<Record<string, unknown>>
  const names = items
    .map(item => (item.name ?? item.displayName ?? item.username ?? item.id) as string)
    .filter(Boolean)
    .slice(0, 5)
  const total = (data.total as number) ?? items.length

  return { total, names, summary: r.summary as string | undefined }
})

const statusLabel = computed(() => {
  if (isRunning.value) return '调用中...'
  if (isDone.value) return '完成'
  if (isError.value) return '失败'
  return ''
})

function toggleCollapse(): void {
  collapsed.value = !collapsed.value
}

function formatJson(content: string): string {
  try {
    const parsed = JSON.parse(content)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return content
  }
}
</script>

<template>
  <div :class="[$style.card, $style[`type_${type}`]]">
    <!-- Header -->
    <div
      v-if="hasHeader"
      :class="[$style.header, { [$style.headerError]: isError }]"
      @click="toggleCollapse"
    >
      <div :class="$style.headerLeft">
        <!-- Icon -->
        <div :class="[$style.icon, $style[`icon_${type}`]]">
          <!-- thinking icon -->
          <svg v-if="type === 'thinking'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <!-- tool_call icon -->
          <svg v-else-if="type === 'tool_call'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <!-- tool_error icon -->
          <svg v-else-if="type === 'tool_error'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <!-- Title + subtitle -->
        <div :class="$style.headerText">
          <div :class="$style.title">
            {{ type === 'tool_error' ? '工具调用失败' : title }}
            <span v-if="agent" :class="[$style.agentBadge, $style[`agent_${agent}`]]">
              {{ agentLabels[agent] }}
            </span>
          </div>
          <div v-if="toolName && (type === 'tool_call' || type === 'tool_error')" :class="$style.subtitle">
            {{ toolName }}
          </div>
          <div v-else-if="type === 'thinking'" :class="$style.subtitle">
            {{ isRunning ? '分析需求中...' : '已完成思考' }}
          </div>
        </div>
      </div>
      <div :class="$style.headerRight">
        <!-- Timestamp -->
        <div v-if="timestamp" :class="$style.timestamp">
          {{ formatTime(timestamp) }}
        </div>
        <!-- Status indicator for tool cards -->
        <div v-if="type === 'tool_call' || type === 'tool_error'" :class="$style.status">
          <span :class="[$style.statusDot, isRunning ? $style.statusDotLoading : isError ? $style.statusDotError : $style.statusDotSuccess]" />
          <span>{{ statusLabel }}</span>
        </div>
        <!-- Thinking badge -->
        <span v-if="type === 'thinking' && !isRunning" :class="$style.badgeThinking">思考完成</span>
        <!-- Collapse toggle -->
        <div :class="[$style.toggle, { [$style.toggleExpanded]: !collapsed }]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div :class="[$style.body, { [$style.bodyCollapsed]: collapsed && hasHeader }]">
      <!-- 折叠状态摘要 -->
      <div v-if="collapsed && hasHeader" :class="$style.collapsedSummary">
        <template v-if="type === 'thinking'">
          <span :class="$style.summaryText">已完成思考</span>
        </template>
        <template v-else-if="type === 'tool_call'">
          <span :class="$style.summaryText">{{ toolDisplayName }}</span>
          <span v-if="hasToolResult" :class="$style.summaryBadge">完成</span>
          <span v-else-if="isRunning" :class="$style.summaryBadgeRunning">执行中</span>
        </template>
        <template v-else-if="type === 'tool_error'">
          <span :class="$style.summaryTextError">调用失败</span>
        </template>
      </div>

      <!-- 展开状态内容 -->
      <template v-if="!collapsed || !hasHeader">
        <!-- thinking / text content -->
        <div
          v-if="(type === 'thinking' || type === 'text') && content"
          :class="type === 'text' ? $style.markdown : $style.thinkingContent"
          v-html="renderedContent"
        />

        <!-- JSON code block (for "JSON 数据" title) -->
        <div v-if="type === 'text' && title === 'JSON 数据' && content" :class="$style.jsonBlock">
          <div :class="$style.jsonBlockLabel">JSON 数据</div>
          <pre><code>{{ formatJson(content) }}</code></pre>
        </div>

      <!-- tool call / tool error content -->
      <template v-if="type === 'tool_call' || type === 'tool_error'">
        <!-- Error display -->
        <div v-if="isError" :class="$style.errorContent">
          <svg :class="$style.errorIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <div :class="$style.errorText">{{ error ?? '工具执行失败' }}</div>
        </div>

        <!-- Tool details (success) -->
        <template v-else>
          <div v-if="hasToolDetails" :class="$style.toolSection">
            <div :class="$style.toolSectionLabel">参数</div>
            <div :class="$style.toolJson">
              <pre>{{ JSON.stringify(toolArguments, null, 2) }}</pre>
            </div>
          </div>
          <!-- 搜索工具：精简显示 -->
          <div v-if="compactResult" :class="$style.toolSection">
            <div :class="$style.toolSectionLabel">结果</div>
            <div v-if="compactResult.summary" :class="$style.toolSummary">{{ compactResult.summary }}</div>
            <ul v-if="compactResult.names.length > 0" :class="$style.compactList">
              <li v-for="(name, i) in compactResult.names" :key="i">{{ name }}</li>
              <li v-if="compactResult.total > compactResult.names.length" :class="$style.moreItem">
                ...共 {{ compactResult.total }} 条
              </li>
            </ul>
            <details :class="$style.rawDetails">
              <summary>查看原始数据</summary>
              <div :class="$style.toolJson"><pre>{{ JSON.stringify(toolResult, null, 2) }}</pre></div>
            </details>
          </div>
          <!-- 非搜索工具：保持原样 -->
          <template v-else>
            <div v-if="hasToolResult" :class="$style.toolSection">
              <div :class="$style.toolSectionLabel">结果</div>
              <div v-if="toolResultSummary" :class="$style.toolSummary">{{ toolResultSummary }}</div>
              <div :class="$style.toolJson">
                <pre>{{ JSON.stringify(toolResult, null, 2) }}</pre>
              </div>
            </div>
          </template>
          <!-- Loading indicator for running tool calls -->
          <div v-if="isRunning" :class="$style.typingIndicator">
            <span :class="$style.typingDot" />
            <span :class="$style.typingDot" />
            <span :class="$style.typingDot" />
          </div>
        </template>
      </template>

        <!-- result embedded card slot -->
        <slot v-if="type === 'result'" />

        <!-- tool call extra slot -->
        <slot v-if="type === 'tool_call' && !isError" name="tool-extra" />
      </template>
    </div>

    <!-- Footer for result cards (schema/flow) -->
    <div v-if="type === 'result' && (primaryAction || secondaryAction)" :class="$style.footer">
      <button
        v-if="secondaryAction"
        :class="$style.btnOutline"
        @click="$emit('secondary-action')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        {{ secondaryAction }}
      </button>
      <button
        v-if="primaryAction"
        :class="$style.btnPrimary"
        @click="$emit('primary-action')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {{ primaryAction }}
      </button>
    </div>
  </div>
</template>

<style module src="./AiStepCard.module.css" />
