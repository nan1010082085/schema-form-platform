<script setup lang="ts">
/**
 * AI 侧边抽屉视图
 *
 * 400px 宽单栏布局，嵌入 Editor / Flow 内使用。
 * 对齐 docs/designs/ui/ai/sidebar.html 设计。
 *
 * 特点：
 * - 无对话列表、无预览面板
 * - Agent 可切换（支持同项目多 Agent）
 * - 有上下文条（Schema / Node 信息）
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useAiStore } from '@/stores/ai'
import { bridge } from '@/utils/bridge'
import { useQiankun } from '@schema-form/shared-qiankun'
import { message } from '@schema-form/shared-utils/message'
import { connect as connectSocket, isConnected, emitAiApply, emitAiPublished } from '@schema-form/socket'
import AiMessage from '@/components/AiMessage.vue'
import type { AgentType, Widget, FlowGraph } from '@/types'
import type { MessageEmbeddedCard } from '@/components/AiMessage.vue'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'
import { Clock } from '@element-plus/icons-vue'

const store = useAiStore()

// ---- WebSocket 状态 ----
const wsConnected = ref(isConnected())

// 定期检查连接状态
let statusTimer: ReturnType<typeof setInterval> | null = null

function startStatusCheck(): void {
  statusTimer = setInterval(() => {
    wsConnected.value = isConnected()
  }, 1000)
}

// ---- History Dialog ----
const historyVisible = ref(false)

function handleOpenHistory(): void {
  historyVisible.value = true
  store.loadConversations()
}

// Agent 配置：从 URL query 读取初始值，支持切换
const params = new URLSearchParams(window.location.search)
const initialAgent = (params.get('agent') as AgentType) ?? 'editor'

// 可用 Agents 配置（根据项目类型）
const agentConfig: Record<string, { agents: AgentType[]; label: Partial<Record<AgentType, string>> }> = {
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

// 监听消息数量变化（新消息）和最后一条消息内容长度变化（流式响应）
watch(
  () => {
    const last = store.messages[store.messages.length - 1]
    return `${store.messages.length}:${last?.content?.length ?? 0}`
  },
  scrollToBottom,
)

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
    handleOpenInEditor()
  }
}

async function handleOpenInEditor(): Promise<void> {
  try {
    const result = await store.publishCurrent()
    if (!result) {
      message.warning('没有可发布的内容')
      return
    }

    const payload = {
      schema: store.currentSchema,
      flow: store.currentFlow,
      id: result.id,
      type: result.type,
    }

    emitAiApply({
      type: result.type,
      payload: (result.type === 'schema' ? store.currentSchema : store.currentFlow)!,
      conversationId: store.currentConversationId ?? undefined,
    })
    bridge.send('ai:open-in-editor', payload)
  } catch {
    message.error('发布失败，请稍后重试')
  }
}

async function handleApply() {
  const isSchema = !!store.currentSchema
  const type = isSchema ? 'schema' : 'flow'

  try {
    // 通过 Socket 推送到宿主
    emitAiApply({
      type,
      payload: (isSchema ? store.currentSchema : store.currentFlow)!,
      conversationId: store.currentConversationId ?? undefined,
    })

    // 同时发布到服务端
    const result = await store.publishCurrent()
    if (result) {
      message.success(isSchema ? '表单已应用到画布并发布成功' : '流程已应用到画布并发布成功')
      if (result.publishId) {
        emitAiPublished({
          type: result.type,
          id: result.id,
          publishId: result.publishId,
          conversationId: store.currentConversationId ?? undefined,
        })
      }
      bridge.send('ai:published', {
        id: result.id,
        publishId: result.publishId,
        type: result.type,
      })
    } else {
      message.warning('没有可发布的内容')
    }
  } catch {
    message.error('应用失败，请稍后重试')
  }
}

onMounted(() => {
  // 设置 agent
  store.switchAgent(selectedAgent.value)

  // 连接 Socket
  connectSocket()
  startStatusCheck()

  // 监听宿主上下文（standalone 模式 postMessage）
  bridge.on('ai:set-context', (payload) => {
    store.setContext(payload)
  })

  bridge.on('ai:current-schema', (payload) => {
    store.setCurrentSchema(payload)
  })

  // qiankun 模式：从全局状态读取初始数据
  if (window.__POWERED_BY_QIANKUN__) {
    const { getGlobalState, onGlobalStateChange } = useQiankun()
    const state = getGlobalState()
    if (Object.keys(state).length > 0) {
      handleHostData(state)
    }
    onGlobalStateChange((newState) => {
      handleHostData(newState)
    })
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
  if (data.selectedWidget && typeof data.selectedWidget === 'object') {
    store.setContext({ selectedWidget: data.selectedWidget as import('@/types').SelectedWidgetInfo })
  }
  if (data.editorMode && (data.editorMode === 'edit' || data.editorMode === 'preview')) {
    store.setContext({ editorMode: data.editorMode as 'edit' | 'preview' })
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
        <el-button
          :class="$style.historyBtn"
          title="历史记录"
          link
          @click="handleOpenHistory"
        >
          <el-icon :size="14"><Clock /></el-icon>
        </el-button>
      </div>
      <div :class="$style.headerRight">
        <!-- WebSocket 状态 -->
        <div :class="[$style.wsStatus, wsConnected ? $style.wsConnected : $style.wsDisconnected]">
          <span :class="$style.wsDot" />
          <span>{{ wsConnected ? '已连接' : '未连接' }}</span>
        </div>
        <div :class="$style.modelBadge">
          <span :class="$style.modelDot"></span>
          <span>DeepSeek</span>
        </div>
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
        :key="`${idx}-${msg.content?.length ?? 0}-${msg.toolCalls?.length ?? 0}`"
        :role="msg.role === 'system' ? 'assistant' : msg.role"
        :label="getLabel(msg)"
        :agent="selectedAgent"
        :content="msg.content"
        :thinking="msg.thinking"
        :tip="msg.tip"
        :tool-calls="msg.toolCalls"
        :loading="store.loading && msg.role === 'assistant' && !msg.content && idx === store.messages.length - 1"
        :cards="getDisplayCards(msg)"
        :schema-widgets="msg.schema"
        @card-primary-action="handleCardAction('primary')"
        @card-secondary-action="handleCardAction('secondary')"
        @retry-tool="(tci) => store.retryToolCall(idx, tci)"
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
            <el-select
              v-model="selectedAgent"
              :disabled="store.loading"
              size="small"
              style="width: 100px"
            >
              <el-option
                v-for="item in agentOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <el-button
              v-if="store.loading"
              :class="$style.stopBtn"
              title="停止生成"
              type="primary"
              link
              @click="handleStop"
            >
              <AppIcon name="video-pause" :size="14" />
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- History Dialog -->
    <el-dialog
      v-model="historyVisible"
      title="对话历史"
      width="400px"
      :z-index="2000"
    >
      <div :class="$style.historyList">
        <div
          v-for="conv in store.conversations"
          :key="conv.id"
          :class="[$style.historyItem, { [$style.historyActive]: conv.id === store.currentConversationId }]"
          @click="store.loadConversation(conv.id); historyVisible = false"
        >
          <div :class="$style.historyTitle">{{ conv.title }}</div>
          <div :class="$style.historyMeta">
            <span :class="$style.historyAgent">{{ conv.activeAgent }}</span>
            <span :class="$style.historyTime">{{ new Date(conv.updatedAt).toLocaleString('zh-CN') }}</span>
          </div>
        </div>
        <div v-if="store.conversations.length === 0" :class="$style.historyEmpty">
          暂无对话记录
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style module src="./AiSidebarView.module.scss" />
