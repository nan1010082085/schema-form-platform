<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AiMessage from './AiMessage.vue'
import TaskChainBar from './TaskChainBar.vue'
import { uploadFile } from '@/api/aiApi'
import type { AIMessage, AgentType, Attachment, TaskChainStep, SSEConnectionStatus } from '@/types'
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
  send: [message: string, agent: AgentType]
  stop: []
  retry: []
  'clear-messages': []
  'card-primary-action': [messageIndex: number, cardIndex: number]
  'card-secondary-action': [messageIndex: number, cardIndex: number]
}>()

const inputText = ref('')
const selectedAgent = ref<AgentType>('auto')
const messagesRef = ref<HTMLElement>()

// ---- 多模态输入 ----
const fileInputRef = ref<HTMLInputElement>()
const fileUploading = ref(false)
const pendingAttachments = ref<Attachment[]>([])

const ALLOWED_FILE_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

function triggerFileUpload(): void {
  fileInputRef.value?.click()
}

function handleFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    processFile(file)
  }
  input.value = ''
}

async function processFile(file: File): Promise<void> {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    ElMessage.error('支持的格式：PNG、JPG、GIF、WebP、PDF、DOC、DOCX、TXT')
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB')
    return
  }

  const attachment: Attachment = {
    filename: file.name,
    mimetype: file.type,
    size: file.size,
    text: '',
    status: 'uploading',
  }
  pendingAttachments.value.push(attachment)
  const index = pendingAttachments.value.length - 1

  try {
    const result = await uploadFile(file)
    pendingAttachments.value[index] = {
      ...result,
      status: 'done',
    }
    ElMessage.success(`"${file.name}" 上传成功`)
  } catch (err) {
    pendingAttachments.value[index] = {
      ...attachment,
      status: 'error',
      error: err instanceof Error ? err.message : '上传失败',
    }
    ElMessage.error(`上传失败: ${err instanceof Error ? err.message : '未知错误'}`)
  }
}

function removeAttachment(index: number): void {
  pendingAttachments.value.splice(index, 1)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimetype: string): string {
  if (mimetype.startsWith('image/')) return '\u{1F5BC}'
  if (mimetype === 'application/pdf') return '\u{1F4D5}'
  if (mimetype.includes('word') || mimetype.includes('document')) return '\u{1F4D3}'
  return '\u{1F4C4}'
}

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

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleSend() {
  const text = inputText.value.trim()
  // 允许只发送附件（无文本）
  if ((!text && pendingAttachments.value.length === 0) || props.disabled) return

  // 构建包含附件上下文的消息
  let messageContent = text
  if (pendingAttachments.value.length > 0) {
    const attachmentTexts = pendingAttachments.value
      .filter((a) => a.text && a.status === 'done')
      .map((a) => `[附件: ${a.filename}]\n${a.text}`)
      .join('\n\n')
    if (attachmentTexts) {
      messageContent = text
        ? `${attachmentTexts}\n\n${text}`
        : attachmentTexts
    }
  }

  emit('send', messageContent, selectedAgent.value)

  // 清空状态
  inputText.value = ''
  pendingAttachments.value = []
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
        <!-- 附件预览 -->
        <div v-if="pendingAttachments.length > 0" :class="$style.attachmentList">
          <div
            v-for="(att, idx) in pendingAttachments"
            :key="idx"
            :class="[$style.attachmentItem, { [$style.attachmentError]: att.status === 'error' }]"
          >
            <span :class="$style.attachmentIcon">{{ getFileIcon(att.mimetype) }}</span>
            <div :class="$style.attachmentInfo">
              <span :class="$style.attachmentName">{{ att.filename }}</span>
              <span :class="$style.attachmentSize">{{ formatFileSize(att.size) }}</span>
            </div>
            <span v-if="att.status === 'uploading'" :class="$style.attachmentLoading" />
            <span v-else-if="att.status === 'error'" :class="$style.attachmentErrorText">
              {{ att.error ?? '失败' }}
            </span>
            <button
              :class="$style.attachmentRemove"
              title="移除"
              @click="removeAttachment(idx)"
            >
              &times;
            </button>
          </div>
        </div>

        <textarea
          v-model="inputText"
          :class="$style.inputField"
          :placeholder="messages.length === 0 ? '描述你想要生成的内容...' : '继续描述...'"
          :disabled="disabled || loading"
          rows="1"
          @keydown="handleKeydown"
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
          <div :class="$style.inputActions">
            <!-- Hidden file input -->
            <input
              ref="fileInputRef"
              type="file"
              :accept="ALLOWED_FILE_TYPES.join(',')"
              :class="$style.hiddenInput"
              @change="handleFileChange"
            />
            <!-- File upload button -->
            <button
              :class="$style.fileBtn"
              :disabled="disabled || loading || fileUploading"
              title="上传文件（图片/PDF/文档）"
              @click="triggerFileUpload"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <el-select
              v-model="selectedAgent"
              :class="$style.agentSelect"
              :disabled="disabled || loading"
              size="small"
              teleport="disabled"
            >
              <el-option
                v-for="opt in agentOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <button
              v-if="loading"
              :class="$style.stopBtn"
              title="停止生成"
              @click="emit('stop')"
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

<style module src="./AiChatPanel.module.css" />
