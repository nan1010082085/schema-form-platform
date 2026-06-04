<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import AiLoadingDots from './AiLoadingDots.vue'
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
}

const props = withDefaults(defineProps<AiStepCardProps>(), {
  status: 'done',
  isLast: false,
})

const emit = defineEmits<{
  'primary-action': []
  'secondary-action': []
}>()

const TYPE_META: Record<StepType, { icon: string; color: string }> = {
  thinking: { icon: '\u{1F4AD}', color: 'var(--ai-color-purple, #7C3AED)' },
  tool_call: { icon: '\u{1F527}', color: 'var(--ai-color-primary, #0060A2)' },
  tool_error: { icon: '\u{274C}', color: 'var(--ai-color-danger, #E63535)' },
  result: { icon: '\u{1F4CB}', color: 'var(--ai-color-success, #26A036)' },
  text: { icon: '\u{1F4AC}', color: 'var(--ai-text-muted, #909399)' },
}

const COLLAPSED_BY_DEFAULT: Set<StepType> = new Set(['thinking', 'tool_call'])

const meta = computed(() => TYPE_META[props.type])
const collapsed = ref(COLLAPSED_BY_DEFAULT.has(props.type))

const hasHeader = computed(() => props.type === 'thinking' || props.type === 'tool_call' || props.type === 'tool_error')

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

function toggleCollapse(): void {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <div :class="$style.step">
    <div :class="$style.track">
      <div :class="[$style.number, $style[`status_${status}`]]">
        <AiLoadingDots v-if="isRunning" :size="4" />
        <span v-else-if="isDone" :class="$style.checkIcon">&#x2713;</span>
        <span v-else-if="isError" :class="$style.errorIcon">!</span>
        <span v-else>{{ index }}</span>
      </div>
      <div v-if="!isLast" :class="$style.line" />
    </div>

    <div :class="[$style.card, $style[`type_${type}`]]">
      <div
        v-if="hasHeader"
        :class="$style.header"
        @click="toggleCollapse"
      >
        <span :class="$style.typeIcon">{{ meta.icon }}</span>
        <span :class="$style.title">{{ title }}</span>
        <span v-if="isRunning" :class="$style.runningTag">运行中</span>
        <span :class="$style.collapseIcon">{{ collapsed ? '▸' : '▾' }}</span>
      </div>

      <div v-if="!hasHeader || !collapsed" :class="$style.body">
        <!-- thinking / text 内容 (both rendered as Markdown) -->
        <div
          v-if="(type === 'thinking' || type === 'text') && content"
          :class="type === 'text' ? $style.markdown : $style.textContent"
          v-html="renderedContent"
        />

        <!-- tool call / tool error 内容 -->
        <template v-if="type === 'tool_call' || type === 'tool_error'">
          <div :class="$style.toolName">
            <span :class="[$style.toolBadge, { [$style.toolBadgeError]: isError }]">
              {{ toolDisplayName ?? toolName ?? title }}
            </span>
            <span v-if="toolName" :class="$style.toolRaw">{{ toolName }}</span>
          </div>
          <div v-if="isError" :class="$style.errorCard">
            <span :class="$style.errorBadgeIcon">!</span>
            <span :class="$style.errorText">{{ error ?? '工具执行失败' }}</span>
          </div>
          <template v-else>
            <div v-if="hasToolDetails" :class="$style.toolSection">
              <div :class="$style.toolSectionLabel">参数</div>
              <pre :class="$style.toolPre">{{ JSON.stringify(toolArguments, null, 2) }}</pre>
            </div>
            <div v-if="hasToolResult" :class="$style.toolSection">
              <div :class="$style.toolSectionLabel">结果</div>
              <div v-if="toolResultSummary" :class="$style.toolSummary">{{ toolResultSummary }}</div>
              <pre :class="$style.toolPre">{{ JSON.stringify(toolResult, null, 2) }}</pre>
            </div>
          </template>
        </template>

        <!-- result 嵌入卡片 -->
        <slot v-if="type === 'result'" />

        <!-- 工具调用步骤的插槽（用于嵌入额外内容） -->
        <slot v-if="type === 'tool_call' && !isError" name="tool-extra" />
      </div>
    </div>
  </div>
</template>

<style module src="./AiStepCard.module.css" />
