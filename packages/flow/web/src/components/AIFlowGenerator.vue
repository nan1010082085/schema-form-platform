<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">
        <span :class="$style.icon">🤖</span>
        AI 流程生成器
      </h3>
      <p :class="$style.subtitle">描述你的流程需求，AI 帮你自动生成</p>
    </div>

    <div :class="$style.inputSection">
      <el-input
        v-model="flowName"
        placeholder="输入流程名称，例如：请假审批流程"
        :class="$style.nameInput"
        size="large"
      />
      <el-input
        v-model="flowDescription"
        type="textarea"
        :rows="6"
        placeholder="描述流程需求，例如：&#10;1. 员工提交请假申请&#10;2. 直属主管审批&#10;3. 如果超过3天，需要部门经理审批&#10;4. HR备案&#10;5. 通知员工结果"
        :class="$style.descInput"
      />
      <div :class="$style.actions">
        <el-button
          type="primary"
          size="large"
          :loading="generating"
          :disabled="!flowDescription.trim()"
          @click="handleGenerate"
        >
          <span v-if="!generating">🤖 AI 生成流程</span>
          <span v-else>生成中...</span>
        </el-button>
        <el-button size="large" @click="handleClear">清空</el-button>
      </div>
    </div>

    <div v-if="generatedFlow" :class="$style.previewSection">
      <div :class="$style.previewHeader">
        <h4 :class="$style.previewTitle">生成的流程</h4>
        <div :class="$style.previewActions">
          <el-button type="success" @click="handleApply">
            ✨ 应用到画布
          </el-button>
          <el-button @click="handleRegenerate">重新生成</el-button>
        </div>
      </div>

      <div :class="$style.flowPreview">
        <div :class="$style.nodeList">
          <div
            v-for="(node, index) in generatedFlow.nodes"
            :key="node.id"
            :class="$style.nodeItem"
          >
            <div :class="$style.nodeIcon">{{ getNodeIcon(node.type) }}</div>
            <div :class="$style.nodeLabel">{{ node.data?.name || node.type }}</div>
            <div v-if="index < generatedFlow.nodes.length - 1" :class="$style.nodeArrow">→</div>
          </div>
        </div>
      </div>

      <div v-if="aiResponse" :class="$style.aiMessage">
        <div :class="$style.messageHeader">AI 分析</div>
        <div :class="$style.messageContent">{{ aiResponse }}</div>
      </div>
    </div>

    <div v-if="error" :class="$style.error">
      <el-alert :title="error" type="error" show-icon @close="error = ''" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

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

interface GeneratedFlow {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

const emit = defineEmits<{
  apply: [flow: GeneratedFlow]
}>()

const flowName = ref('')
const flowDescription = ref('')
const generating = ref(false)
const generatedFlow = ref<GeneratedFlow | null>(null)
const aiResponse = ref('')
const error = ref('')

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

async function handleGenerate() {
  if (!flowDescription.value.trim()) return

  generating.value = true
  error.value = ''
  generatedFlow.value = null
  aiResponse.value = ''

  try {
    const prompt = buildPrompt()
    const response = await callAI(prompt)
    parseResponse(response)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '生成失败，请重试'
  } finally {
    generating.value = false
  }
}

function buildPrompt(): string {
  const name = flowName.value.trim() || '未命名流程'
  return `请根据以下描述生成一个 BPMN 流程定义：

流程名称：${name}
流程描述：${flowDescription.value}

要求：
1. 生成标准的流程节点（开始事件、结束事件、用户任务、服务任务、网关等）
2. 节点之间要有正确的连线关系
3. 如果有条件分支，使用排他网关
4. 输出 JSON 格式的流程定义

输出格式：
{
  "nodes": [
    { "id": "node_1", "type": "start-event", "data": { "name": "开始" } },
    { "id": "node_2", "type": "user-task", "data": { "name": "任务名称" } },
    ...
  ],
  "edges": [
    { "id": "edge_1", "source": "node_1", "target": "node_2" },
    ...
  ]
}`
}

async function callAI(prompt: string): Promise<string> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) {
    throw new Error('请先登录')
  }

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: prompt,
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
  try {
    // 尝试从响应中提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('无法解析 AI 响应，请重试')
    }

    const flowData = JSON.parse(jsonMatch[0])

    // 验证结构
    if (!Array.isArray(flowData.nodes) || !Array.isArray(flowData.edges)) {
      throw new Error('无效的流程格式')
    }

    // 添加位置信息（如果没有）
    const nodes = flowData.nodes.map((node: FlowNode, index: number) => ({
      ...node,
      position: node.position || { x: 100 + index * 200, y: 100 },
    }))

    generatedFlow.value = { nodes, edges: flowData.edges }
    aiResponse.value = '已根据您的描述生成流程，您可以点击"应用到画布"使用。'
  } catch (err) {
    // 如果解析失败，显示原始响应
    aiResponse.value = response
    error.value = '无法解析为流程格式，请尝试更详细的描述'
  }
}

function handleApply() {
  if (generatedFlow.value) {
    emit('apply', generatedFlow.value)
    ElMessage.success('流程已应用到画布')
  }
}

function handleRegenerate() {
  handleGenerate()
}

function handleClear() {
  flowName.value = ''
  flowDescription.value = ''
  generatedFlow.value = null
  aiResponse.value = ''
  error.value = ''
}
</script>

<style module>
.container {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.icon {
  font-size: 32px;
}

.subtitle {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.inputSection {
  margin-bottom: 32px;
}

.nameInput {
  margin-bottom: 16px;
}

.descInput {
  margin-bottom: 16px;
}

.actions {
  display: flex;
  gap: 12px;
}

.previewSection {
  background: var(--el-fill-color-lighter);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.previewHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.previewTitle {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.previewActions {
  display: flex;
  gap: 12px;
}

.flowPreview {
  background: white;
  border-radius: 8px;
  padding: 20px;
  overflow-x: auto;
}

.nodeList {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.nodeItem {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nodeIcon {
  font-size: 32px;
}

.nodeLabel {
  background: var(--el-color-primary-light-9);
  border: 2px solid var(--el-color-primary);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-color-primary);
}

.nodeArrow {
  font-size: 24px;
  color: var(--el-color-primary);
}

.aiMessage {
  margin-top: 20px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.messageHeader {
  background: var(--el-color-primary-light-9);
  padding: 12px 16px;
  font-weight: 600;
  color: var(--el-color-primary);
  font-size: 14px;
}

.messageContent {
  padding: 16px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
}

.error {
  margin-top: 16px;
}
</style>
