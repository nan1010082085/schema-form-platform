<template>
  <div :class="$style.container">
    <div :class="$style.messages" ref="messagesRef">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        :class="[$style.message, $style[msg.role]]"
      >
        <div :class="$style.messageAvatar">
          {{ msg.role === 'user' ? '👤' : '🤖' }}
        </div>
        <div :class="$style.messageContent">
          <div :class="$style.messageText">{{ msg.content }}</div>
          <div v-if="msg.flowData" :class="$style.flowPreview">
            <div :class="$style.flowPreviewHeader">生成的流程</div>
            <div :class="$style.flowPreviewNodes">
              <span
                v-for="(node, i) in msg.flowData.nodes.slice(0, 5)"
                :key="node.id"
              >
                {{ getNodeIcon(node.type) }} {{ node.data?.name || node.type }}
                <span v-if="i < Math.min(msg.flowData.nodes.length, 5) - 1"> → </span>
              </span>
              <span v-if="msg.flowData.nodes.length > 5"> ...</span>
            </div>
            <t-button
              size="small"
              theme="primary"
              :class="$style.applyBtn"
              @click="handleApplyFlow(msg.flowData)"
            >
              应用到画布
            </t-button>
          </div>
        </div>
      </div>

      <div v-if="loading" :class="[$style.message, $style.assistant]">
        <div :class="$style.messageAvatar">🤖</div>
        <div :class="$style.messageContent">
          <div :class="$style.typing">
            <span :class="$style.dot"></span>
            <span :class="$style.dot"></span>
            <span :class="$style.dot"></span>
          </div>
        </div>
      </div>
    </div>

    <div :class="$style.inputArea">
      <t-input
        v-model="inputText"
        type="textarea"
        :rows="3"
        placeholder="描述你想要的流程，或问我任何问题..."
        :disabled="loading"
        @keydown.enter.ctrl="handleSend"
      />
      <div :class="$style.inputActions">
        <span :class="$style.hint">Ctrl + Enter 发送</span>
        <t-button
          theme="primary"
          :loading="loading"
          :disabled="!inputText.trim()"
          @click="handleSend"
        >
          发送
        </t-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data?: Record<string, unknown>
}

interface FlowEdge {
  id: string
  source: string
  target: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  flowData?: { nodes: FlowNode[]; edges: FlowEdge[] }
}

const props = defineProps<{
  nodes: FlowNode[]
  edges: FlowEdge[]
}>()

const emit = defineEmits<{
  updateFlow: [updates: { nodes?: FlowNode[]; edges?: FlowEdge[] }]
}>()

const NODE_ICONS: Record<string, string> = {
  'start-event': '▶️',
  'end-event': '⏹️',
  'user-task': '📝',
  'service-task': '⚙️',
  'exclusive-gateway': '🔀',
  'parallel-gateway': '➗',
  'inclusive-gateway': '⭕',
  'sub-process': '📦',
  'ai-task': '🤖',
}

function getNodeIcon(type: string): string {
  return NODE_ICONS[type] || '📋'
}

const messages = ref<Message[]>([
  {
    role: 'assistant',
    content: '你好！我是 AI 流程助手。我可以帮你：\n\n1. 通过描述生成流程\n2. 分析和优化现有流程\n3. 回答流程相关问题\n\n请告诉我你需要什么帮助？',
  },
])

const inputText = ref('')
const loading = ref(false)
const messagesRef = ref<HTMLElement>()

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  // 添加用户消息
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  scrollToBottom()

  loading.value = true

  try {
    const response = await callAI(text)
    parseResponse(response)
  } catch (err) {
    messages.value.push({
      role: 'assistant',
      content: `抱歉，出现了错误：${err instanceof Error ? err.message : '未知错误'}`,
    })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

async function callAI(prompt: string): Promise<string> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) {
    throw new Error('请先登录')
  }

  // 构建上下文
  let contextInfo = ''
  if (props.nodes.length > 0) {
    contextInfo = `\n\n当前流程包含 ${props.nodes.length} 个节点：`
    props.nodes.forEach(node => {
      const name = (node.data?.name as string) || node.type
      contextInfo += `\n- ${name} (${node.type})`
    })
  }

  const fullPrompt = prompt + contextInfo

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: fullPrompt,
      context: {
        source: 'flow',
      },
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error?.message || '请求失败')
  }

  // 处理 SSE 流式响应
  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取响应')

  const decoder = new TextDecoder()
  let fullContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'content') {
            fullContent += data.content
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }

  return fullContent
}

function parseResponse(response: string) {
  // 尝试提取流程数据
  const jsonMatch = response.match(/\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/)

  if (jsonMatch) {
    try {
      const flowData = JSON.parse(jsonMatch[0])
      if (Array.isArray(flowData.nodes) && Array.isArray(flowData.edges)) {
        // 添加位置信息
        const nodes = flowData.nodes.map((node: FlowNode, index: number) => ({
          ...node,
          position: node.position || { x: 100 + index * 200, y: 100 },
        }))

        messages.value.push({
          role: 'assistant',
          content: '我为你生成了一个流程，点击下方按钮应用到画布。',
          flowData: { nodes, edges: flowData.edges },
        })
        return
      }
    } catch {
      // 解析失败，作为普通文本处理
    }
  }

  // 普通文本响应
  messages.value.push({ role: 'assistant', content: response })
}

function handleApplyFlow(flowData: { nodes: FlowNode[]; edges: FlowEdge[] }) {
  emit('updateFlow', { nodes: flowData.nodes, edges: flowData.edges })
}
</script>

<style module>
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 85%;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.assistant {
  align-self: flex-start;
}

.messageAvatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  background: var(--bg-color-secondary);
}

.message.user .messageAvatar {
  background: var(--color-primary-light);
}

.messageContent {
  background: var(--bg-color-secondary);
  border-radius: 12px;
  padding: 12px 16px;
}

.message.user .messageContent {
  background: var(--color-primary);
  color: white;
}

.messageText {
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.flowPreview {
  margin-top: 12px;
  background: white;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--border-color-lighter);
}

.flowPreviewHeader {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-color-secondary);
  margin-bottom: 8px;
}

.flowPreviewNodes {
  font-size: 14px;
  color: var(--text-color-primary);
  margin-bottom: 12px;
  line-height: 1.6;
}

.applyBtn {
  width: 100%;
}

.typing {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-color-secondary);
  animation: typing 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: 0s;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.inputArea {
  padding: 16px;
  border-top: 1px solid var(--border-color-light);
  background: var(--bg-color-secondary);
}

.inputActions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.hint {
  font-size: 12px;
  color: var(--text-color-secondary);
}
</style>
