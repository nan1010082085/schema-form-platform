<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">
        <AppIcon name="connection" :size="20" />
        AI 助手
      </h3>
      <el-button :class="$style.closeBtn" link @click="$emit('close')">
        <AppIcon name="close" style="font-size: 20px;" />
      </el-button>
    </div>

    <el-tabs v-model="activeTab" :class="$style.tabs">
      <el-tab-pane label="生成流程" name="generate">
        <AIFlowGenerator @apply="handleApplyFlow" />
      </el-tab-pane>
      <el-tab-pane label="优化分析" name="optimize">
        <AIFlowOptimizer
          :nodes="nodes"
          :edges="edges"
          @apply-suggestion="handleApplySuggestion"
        />
      </el-tab-pane>
      <el-tab-pane label="AI 对话" name="chat">
        <AIChat
          :nodes="nodes"
          :edges="edges"
          @update-flow="handleUpdateFlow"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AIFlowGenerator from './AIFlowGenerator.vue'
import AIFlowOptimizer from './AIFlowOptimizer.vue'
import AIChat from './AIChat.vue'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

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

interface Suggestion {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  impact: string
  applicable: boolean
}

defineProps<{
  nodes: FlowNode[]
  edges: FlowEdge[]
}>()

const emit = defineEmits<{
  close: []
  applyFlow: [flow: { nodes: FlowNode[]; edges: FlowEdge[] }]
  updateFlow: [updates: { nodes?: FlowNode[]; edges?: FlowEdge[] }]
}>()

const activeTab = ref('generate')

function handleApplyFlow(flow: { nodes: FlowNode[]; edges: FlowEdge[] }) {
  emit('applyFlow', flow)
}

function handleApplySuggestion(suggestion: Suggestion) {
  // 处理优化建议
  console.log('Apply suggestion:', suggestion)
}

function handleUpdateFlow(updates: { nodes?: FlowNode[]; edges?: FlowEdge[] }) {
  emit('updateFlow', updates)
}
</script>

<style module>
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color);
  border-left: 1px solid var(--border-color-light);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color-light);
  background: var(--bg-color-secondary);
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  font-size: 24px;
}

.closeBtn {
  font-size: 20px;
  color: var(--text-color-secondary);
}

.tabs {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
