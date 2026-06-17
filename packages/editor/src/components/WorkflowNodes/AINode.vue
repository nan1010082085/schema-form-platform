<script setup lang="ts">
/**
 * AINode — AI 节点
 *
 * 集成 AI 对话，通过 SSE 流式调用后端 AI Agent 生成节点配置
 */
import { ref, computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { ElMessage } from 'element-plus'
import { apiClient } from '@/utils/apiClient'
import styles from './WorkflowNode.module.scss'

interface Props {
  data: {
    label: string
    nodeType: string
    config: {
      prompt?: string
      model?: string
      temperature?: number
      operation?: string
      [key: string]: unknown
    }
    description?: string
  }
  selected?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:config', config: Record<string, unknown>): void
}>()

const showAIDialog = ref(false)
const isGenerating = ref(false)
const aiResponse = ref('')
const userPrompt = ref(props.data.config.prompt || '')

function openAIChat(): void {
  userPrompt.value = props.data.config.prompt || ''
  showAIDialog.value = true
}

async function handleAIGenerate(): Promise<void> {
  if (!userPrompt.value.trim()) {
    ElMessage.warning('请输入需求描述')
    return
  }

  isGenerating.value = true
  aiResponse.value = ''

  try {
    // 调用 AI API 生成配置
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sfp_access_token') || ''}`,
      },
      body: JSON.stringify({
        message: `请根据以下需求生成 Workflow 节点配置：${userPrompt.value}`,
        conversationId: null,
        context: {
          source: 'standalone',
        },
      }),
    })

    if (!response.ok) {
      throw new Error('AI 请求失败')
    }

    // SSE 流式读取
    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content' && parsed.content) {
              aiResponse.value += parsed.content
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }

    // 尝试从 AI 响应中提取配置
    try {
      const configMatch = aiResponse.value.match(/```json\n([\s\S]*?)\n```/)
      if (configMatch) {
        const config = JSON.parse(configMatch[1])
        emit('update:config', { ...props.data.config, ...config, prompt: userPrompt.value })
        ElMessage.success('AI 已生成配置')
      }
    } catch {
      // 配置解析失败，保留原始响应
    }

    showAIDialog.value = false
  } catch (error) {
    ElMessage.error('AI 生成失败：' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <div :class="[styles.node, styles.aiNode, selected && styles.selected]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <div :class="styles.nodeHeader">
      <div :class="styles.nodeIcon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22"/>
          <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93"/>
          <circle cx="12" cy="6" r="1"/>
        </svg>
      </div>
      <span :class="styles.nodeLabel">{{ data.label }}</span>
    </div>
    <div :class="styles.nodeContent">
      <span v-if="data.config.model" :class="styles.nodeTag">{{ data.config.model }}</span>
      <span v-if="data.config.operation" :class="styles.nodeTag">{{ data.config.operation }}</span>
    </div>
    <div :class="styles.nodeActions">
      <button :class="styles.actionBtn" @click.stop="openAIChat" title="AI 生成配置">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    </div>
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />

    <!-- AI 对话弹窗 -->
    <t-dialog v-model:visible="showAIDialog" header="AI 生成配置" width="600px">
      <div :class="styles.aiDialogContent">
        <p>描述您的需求，AI 将自动生成节点配置</p>
        <textarea
          v-model="userPrompt"
          placeholder="例如：创建一个表单，包含姓名、部门、入职日期字段"
          :class="styles.aiInput"
          :disabled="isGenerating"
        ></textarea>
        <div v-if="aiResponse" :class="styles.aiResponse">
          <div :class="styles.aiResponseLabel">AI 响应：</div>
          <pre :class="styles.aiResponseContent">{{ aiResponse }}</pre>
        </div>
      </div>
      <template #footer>
        <t-button @click="showAIDialog = false">取消</t-button>
        <t-button theme="primary" :loading="isGenerating" @click="handleAIGenerate">
          {{ isGenerating ? '生成中...' : '生成' }}
        </t-button>
      </template>
    </t-dialog>
  </div>
</template>
