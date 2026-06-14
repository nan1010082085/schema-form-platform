<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">
        <span :class="$style.icon">⚡</span>
        AI 流程优化分析
      </h3>
      <p :class="$style.subtitle">分析当前流程，获取优化建议</p>
    </div>

    <div :class="$style.actions">
      <t-button
        theme="primary"
        size="large"
        :loading="analyzing"
        :disabled="!hasFlow"
        @click="handleAnalyze"
      >
        <span v-if="!analyzing">📊 分析流程</span>
        <span v-else>分析中...</span>
      </t-button>
    </div>

    <div v-if="!hasFlow" :class="$style.emptyState">
      <t-empty description="请先在画布中创建流程" />
    </div>

    <div v-if="analysisResult" :class="$style.resultSection">
      <!-- 流程指标 -->
      <div :class="$style.metricsGrid">
        <div :class="$style.metricCard">
          <div :class="$style.metricIcon">⏱️</div>
          <div :class="$style.metricValue">{{ analysisResult.metrics.avgDuration }}</div>
          <div :class="$style.metricLabel">平均执行时间</div>
        </div>
        <div :class="$style.metricCard">
          <div :class="$style.metricIcon">🔄</div>
          <div :class="$style.metricValue">{{ analysisResult.metrics.nodeCount }}</div>
          <div :class="$style.metricLabel">节点数量</div>
        </div>
        <div :class="$style.metricCard">
          <div :class="$style.metricIcon">🔀</div>
          <div :class="$style.metricValue">{{ analysisResult.metrics.gatewayCount }}</div>
          <div :class="$style.metricLabel">网关数量</div>
        </div>
        <div :class="$style.metricCard">
          <div :class="$style.metricIcon">📈</div>
          <div :class="$style.metricValue">{{ analysisResult.metrics.optimizationPotential }}%</div>
          <div :class="$style.metricLabel">优化潜力</div>
        </div>
      </div>

      <!-- 瓶颈分析 -->
      <div v-if="analysisResult.bottlenecks.length > 0" :class="$style.section">
        <h4 :class="$style.sectionTitle">🚨 瓶颈分析</h4>
        <div :class="$style.bottleneckList">
          <div
            v-for="(bottleneck, index) in analysisResult.bottlenecks"
            :key="index"
            :class="$style.bottleneckItem"
          >
            <div :class="$style.bottleneckIcon">⚠️</div>
            <div :class="$style.bottleneckContent">
              <div :class="$style.bottleneckTitle">{{ bottleneck.node }}</div>
              <div :class="$style.bottleneckDesc">{{ bottleneck.issue }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 优化建议 -->
      <div v-if="analysisResult.suggestions.length > 0" :class="$style.section">
        <h4 :class="$style.sectionTitle">💡 优化建议</h4>
        <div :class="$style.suggestionList">
          <div
            v-for="(suggestion, index) in analysisResult.suggestions"
            :key="index"
            :class="[$style.suggestionItem, $style[`priority-${suggestion.priority}`]]"
          >
            <div :class="$style.suggestionHeader">
              <span :class="$style.suggestionPriority">{{ getPriorityLabel(suggestion.priority) }}</span>
              <span :class="$style.suggestionImpact">影响: {{ suggestion.impact }}</span>
            </div>
            <div :class="$style.suggestionTitle">{{ suggestion.title }}</div>
            <div :class="$style.suggestionDesc">{{ suggestion.description }}</div>
            <t-button
              v-if="suggestion.applicable"
              size="small"
              theme="primary"
              :class="$style.applyBtn"
              @click="handleApplySuggestion(suggestion)"
            >
              应用建议
            </t-button>
          </div>
        </div>
      </div>

      <!-- AI 分析报告 -->
      <div v-if="analysisResult.report" :class="$style.section">
        <h4 :class="$style.sectionTitle">📋 AI 分析报告</h4>
        <div :class="$style.reportContent">{{ analysisResult.report }}</div>
      </div>
    </div>

    <div v-if="error" :class="$style.error">
      <t-alert :title="error" theme="error" closeable @close="error = ''" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

interface FlowNode {
  id: string
  type: string
  data?: Record<string, unknown>
}

interface FlowEdge {
  id: string
  source: string
  target: string
}

interface Bottleneck {
  node: string
  issue: string
}

interface Suggestion {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  impact: string
  applicable: boolean
}

interface AnalysisResult {
  metrics: {
    avgDuration: string
    nodeCount: number
    gatewayCount: number
    optimizationPotential: number
  }
  bottlenecks: Bottleneck[]
  suggestions: Suggestion[]
  report: string
}

const props = defineProps<{
  nodes: FlowNode[]
  edges: FlowEdge[]
}>()

const emit = defineEmits<{
  applySuggestion: [suggestion: Suggestion]
}>()

const analyzing = ref(false)
const analysisResult = ref<AnalysisResult | null>(null)
const error = ref('')

const hasFlow = computed(() => props.nodes.length > 0)

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级',
  }
  return labels[priority] || priority
}

async function handleAnalyze() {
  if (!hasFlow.value) return

  analyzing.value = true
  error.value = ''
  analysisResult.value = null

  try {
    const prompt = buildAnalysisPrompt()
    const response = await callAI(prompt)
    parseAnalysisResult(response)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '分析失败，请重试'
  } finally {
    analyzing.value = false
  }
}

function buildAnalysisPrompt(): string {
  const nodeDescriptions = props.nodes.map(node => {
    const name = (node.data?.name as string) || node.type
    return `- ${node.id}: ${name} (${node.type})`
  }).join('\n')

  const edgeDescriptions = props.edges.map(edge => {
    return `- ${edge.source} → ${edge.target}`
  }).join('\n')

  return `请分析以下流程并提供优化建议：

节点列表：
${nodeDescriptions}

连线关系：
${edgeDescriptions}

请提供：
1. 流程指标分析（平均执行时间、节点数量、网关数量、优化潜力百分比）
2. 瓶颈识别（哪些节点可能导致流程延迟）
3. 优化建议（包括优先级、影响说明、是否可直接应用）
4. 综合分析报告

输出 JSON 格式：
{
  "metrics": {
    "avgDuration": "预估时间",
    "nodeCount": 数量,
    "gatewayCount": 数量,
    "optimizationPotential": 百分比
  },
  "bottlenecks": [
    { "node": "节点名称", "issue": "问题描述" }
  ],
  "suggestions": [
    {
      "title": "建议标题",
      "description": "详细描述",
      "priority": "high/medium/low",
      "impact": "影响说明",
      "applicable": true/false
    }
  ],
  "report": "综合分析报告文本"
}`
}

async function callAI(prompt: string): Promise<string> {
  const token = localStorage.getItem('sfp_access_token') || sessionStorage.getItem('sfp_access_token')
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

function parseAnalysisResult(response: string) {
  try {
    // 尝试从响应中提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*"metrics"[\s\S]*"suggestions"[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('无法解析 AI 响应')
    }

    const data = JSON.parse(jsonMatch[0])

    // 验证结构
    if (!data.metrics || !Array.isArray(data.suggestions)) {
      throw new Error('无效的分析格式')
    }

    analysisResult.value = {
      metrics: {
        avgDuration: data.metrics.avgDuration || '未知',
        nodeCount: data.metrics.nodeCount || props.nodes.length,
        gatewayCount: data.metrics.gatewayCount || 0,
        optimizationPotential: data.metrics.optimizationPotential || 0,
      },
      bottlenecks: Array.isArray(data.bottlenecks) ? data.bottlenecks : [],
      suggestions: data.suggestions.map((s: Suggestion) => ({
        ...s,
        applicable: s.applicable !== false,
      })),
      report: data.report || '',
    }
  } catch (err) {
    // 如果解析失败，显示原始响应
    analysisResult.value = {
      metrics: {
        avgDuration: '未知',
        nodeCount: props.nodes.length,
        gatewayCount: 0,
        optimizationPotential: 0,
      },
      bottlenecks: [],
      suggestions: [],
      report: response,
    }
  }
}

function handleApplySuggestion(suggestion: Suggestion) {
  emit('applySuggestion', suggestion)
  MessagePlugin.success('建议已应用')
}
</script>

<style module>
.container {
  padding: 24px;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color-primary);
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
  color: var(--text-color-secondary);
  margin: 0;
}

.actions {
  text-align: center;
  margin-bottom: 24px;
}

.emptyState {
  padding: 40px 0;
}

.resultSection {
  background: var(--bg-color-secondary);
  border-radius: 12px;
  padding: 24px;
}

.metricsGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.metricCard {
  background: white;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.metricIcon {
  font-size: 32px;
  margin-bottom: 8px;
}

.metricValue {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 4px;
}

.metricLabel {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.sectionTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 16px 0;
}

.bottleneckList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bottleneckItem {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--color-warning-light);
  border-radius: 8px;
  border-left: 4px solid var(--color-warning);
}

.bottleneckIcon {
  font-size: 20px;
  flex-shrink: 0;
}

.bottleneckTitle {
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: 4px;
}

.bottleneckDesc {
  font-size: 14px;
  color: var(--text-color-secondary);
  line-height: 1.6;
}

.suggestionList {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.suggestionItem {
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid var(--color-info);
}

.suggestionItem.priority-high {
  background: var(--color-danger-light);
  border-left-color: var(--color-danger);
}

.suggestionItem.priority-medium {
  background: var(--color-warning-light);
  border-left-color: var(--color-warning);
}

.suggestionItem.priority-low {
  background: var(--color-success-light);
  border-left-color: var(--color-success);
}

.suggestionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.suggestionPriority {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.suggestionImpact {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.suggestionTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: 8px;
}

.suggestionDesc {
  font-size: 14px;
  color: var(--text-color-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.applyBtn {
  width: 100%;
}

.reportContent {
  font-size: 14px;
  color: var(--text-color-secondary);
  line-height: 1.8;
  white-space: pre-wrap;
}

.error {
  margin-top: 16px;
}
</style>
