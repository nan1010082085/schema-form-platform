<script setup lang="ts">
/**
 * AINode — AI 节点
 *
 * 点击"AI"按钮打开 AI 对话，生成节点配置
 */
import { ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { ElDialog, ElButton } from 'element-plus'
import styles from './WorkflowNode.module.scss'

interface Props {
  data: {
    label: string
    nodeType: string
    config: {
      prompt?: string
      model?: string
      temperature?: number
      [key: string]: unknown
    }
    description?: string
  }
  selected?: boolean
}

const props = defineProps<Props>()
const showAIDialog = ref(false)

function openAIChat(): void {
  showAIDialog.value = true
}

function handleAIGenerate(): void {
  // TODO: 集成 AI 对话，生成节点配置
  showAIDialog.value = false
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
    <ElDialog v-model="showAIDialog" title="AI 生成配置" width="500px">
      <div :class="styles.aiDialogContent">
        <p>AI 将根据您的需求自动生成节点配置</p>
        <textarea v-model="data.config.prompt" placeholder="描述您的需求..." :class="styles.aiInput"></textarea>
      </div>
      <template #footer>
        <ElButton @click="showAIDialog = false">取消</ElButton>
        <ElButton type="primary" @click="handleAIGenerate">生成</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
