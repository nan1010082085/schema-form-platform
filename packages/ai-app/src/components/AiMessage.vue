<script setup lang="ts">
import { ref } from 'vue'
import AiLoadingDots from './AiLoadingDots.vue'
import SchemaCard from './SchemaCard.vue'
import FlowCard from './FlowCard.vue'
import type { SchemaField } from './SchemaCard.vue'
import type { FlowNode } from './FlowCard.vue'

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
}

export interface AiMessageProps {
  role: MessageRole
  /** label shown above the message, e.g. "You", "Editor", "Flow" */
  label: string
  /** agent type for coloring — only used when role is 'assistant' */
  agent?: 'editor' | 'flow' | 'auto'
  content?: string
  thinking?: string
  tip?: string
  toolCalls?: ToolCallDisplay[]
  loading?: boolean
  cards?: MessageEmbeddedCard[]
}

defineProps<AiMessageProps>()

const emit = defineEmits<{
  'card-primary-action': [cardIndex: number]
  'card-secondary-action': [cardIndex: number]
}>()

const thinkingExpanded = ref(false)
const toolCallsExpanded = ref(false)

function formatToolName(name: string): string {
  const nameMap: Record<string, string> = {
    search_schemas: '搜索表单',
    get_schema_detail: '获取表单详情',
    search_published_schemas: '搜索已发布表单',
    get_widget_catalogue: '查询组件目录',
    validate_schema: '校验 Schema',
    semantic_search_schemas: '语义搜索表单',
    generate_schema: '生成表单',
    search_flows: '搜索流程',
    get_flow_detail: '获取流程详情',
    search_users: '搜索用户',
    validate_flow: '校验流程',
  }
  return nameMap[name] ?? name
}
</script>

<template>
  <div :class="$style.msg">
    <span :class="[$style.label, role === 'user' ? $style.user : $style.ai]">
      {{ label }}
    </span>

    <!-- Thinking 折叠区 -->
    <div v-if="thinking" :class="$style.thinking">
      <div :class="$style.thinkingHeader" @click="thinkingExpanded = !thinkingExpanded">
        <span :class="$style.thinkingIcon">{{ thinkingExpanded ? '▾' : '▸' }}</span>
        <span :class="$style.thinkingLabel">思考过程</span>
      </div>
      <div v-if="thinkingExpanded" :class="$style.thinkingBody">
        {{ thinking }}
      </div>
    </div>

    <!-- Tool Calls 折叠区 -->
    <div v-if="toolCalls && toolCalls.length > 0" :class="$style.toolCalls">
      <div :class="$style.toolCallsHeader" @click="toolCallsExpanded = !toolCallsExpanded">
        <span :class="$style.toolCallsIcon">{{ toolCallsExpanded ? '▾' : '▸' }}</span>
        <span :class="$style.toolCallsLabel">调用了 {{ toolCalls.length }} 个工具</span>
      </div>
      <div v-if="toolCallsExpanded" :class="$style.toolCallsBody">
        <div v-for="(tc, idx) in toolCalls" :key="idx" :class="$style.toolCallItem">
          <div :class="$style.toolCallName">
            <span :class="$style.toolCallBadge">{{ formatToolName(tc.name) }}</span>
            <span :class="$style.toolCallRaw">{{ tc.name }}</span>
          </div>
          <div v-if="tc.arguments && Object.keys(tc.arguments).length > 0" :class="$style.toolCallArgs">
            <div :class="$style.toolCallArgsLabel">参数</div>
            <pre :class="$style.toolCallArgsPre">{{ JSON.stringify(tc.arguments, null, 2) }}</pre>
          </div>
          <div v-if="tc.result !== undefined" :class="$style.toolCallResult">
            <div :class="$style.toolCallResultLabel">结果</div>
            <div v-if="(tc.result as Record<string, unknown>)?.summary" :class="$style.toolCallSummary">
              {{ (tc.result as Record<string, unknown>).summary }}
            </div>
            <pre :class="$style.toolCallResultPre">{{ JSON.stringify(tc.result, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" :class="$style.body">
      <AiLoadingDots />
    </div>
    <div v-else :class="$style.body">
      <span v-if="content" v-text="content" />
    </div>

    <!-- Tip 提示 -->
    <div v-if="tip" :class="$style.tip">
      <span :class="$style.tipIcon">💡</span>
      <span>{{ tip }}</span>
    </div>

    <template v-if="cards">
      <template v-for="(card, idx) in cards" :key="idx">
        <SchemaCard
          v-if="card.type === 'schema'"
          :title="card.title"
          :fields="card.fields"
          :primary-action="card.primaryAction"
          :secondary-action="card.secondaryAction"
          compact
          @primary-action="emit('card-primary-action', idx)"
          @secondary-action="emit('card-secondary-action', idx)"
        />
        <FlowCard
          v-if="card.type === 'flow'"
          :title="card.title"
          :nodes="card.nodes"
          :primary-action="card.primaryAction"
          :secondary-action="card.secondaryAction"
          compact
          @primary-action="emit('card-primary-action', idx)"
          @secondary-action="emit('card-secondary-action', idx)"
        />
      </template>
    </template>
  </div>
</template>

<style module src="./AiMessage.module.css" />
