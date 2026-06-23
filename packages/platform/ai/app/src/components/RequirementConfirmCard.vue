/**
 * 需求确认卡片
 *
 * 用于展示需求分析结果和确认问题，支持用户回答。
 */

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

interface ConfirmQuestion {
  id: string
  question: string
  options?: string[]
  required: boolean
}

interface RequirementConfirmCardProps {
  /** 需求分析结果 */
  analysis: {
    intent: string
    type: string
    complexity: string
    completeness: {
      score: number
      missing: string[]
      assumptions: string[]
    }
    confirmQuestions: ConfirmQuestion[]
    suggestedChain: Array<{
      agent: string
      description: string
    }>
  }
  /** 是否正在等待用户确认 */
  waitingConfirmation?: boolean
}

const props = withDefaults(defineProps<RequirementConfirmCardProps>(), {
  waitingConfirmation: true,
})

const emit = defineEmits<{
  confirm: [answers: Record<string, string>]
  skip: []
}>()

// 用户答案
const answers = ref<Record<string, string>>({})

// 初始化答案
for (const q of props.analysis.confirmQuestions) {
  answers.value[q.id] = ''
}

// 复杂度标签
const complexityLabel = computed(() => {
  const map: Record<string, string> = {
    simple: '简单',
    medium: '中等',
    complex: '复杂',
  }
  return map[props.analysis.complexity] || props.analysis.complexity
})

// 完整性颜色
const completenessColor = computed(() => {
  const score = props.analysis.completeness.score
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
})

// 是否所有必填问题都已回答
const canConfirm = computed(() => {
  return props.analysis.confirmQuestions
    .filter(q => q.required)
    .every(q => answers.value[q.id]?.trim())
})

function handleConfirm() {
  emit('confirm', { ...answers.value })
}

function handleSkip() {
  emit('skip')
}

function selectOption(questionId: string, option: string) {
  answers.value[questionId] = option
}
</script>

<template>
  <div :class="$style.card">
    <!-- 分析结果概览 -->
    <div :class="$style.summary">
      <div :class="$style.summaryHeader">
        <AppIcon name="analysis" :size="16" />
        <span :class="$style.summaryTitle">需求分析结果</span>
      </div>

      <div :class="$style.summaryGrid">
        <div :class="$style.summaryItem">
          <span :class="$style.summaryLabel">意图</span>
          <span :class="$style.summaryValue">{{ analysis.intent }}</span>
        </div>
        <div :class="$style.summaryItem">
          <span :class="$style.summaryLabel">类型</span>
          <span :class="$style.summaryValue">{{ analysis.type }}</span>
        </div>
        <div :class="$style.summaryItem">
          <span :class="$style.summaryLabel">复杂度</span>
          <el-tag :type="analysis.complexity === 'complex' ? 'danger' : analysis.complexity === 'medium' ? 'warning' : 'success'" size="small">
            {{ complexityLabel }}
          </el-tag>
        </div>
        <div :class="$style.summaryItem">
          <span :class="$style.summaryLabel">完整性</span>
          <el-progress
            :percentage="analysis.completeness.score"
            :color="completenessColor === 'success' ? '#67c23a' : completenessColor === 'warning' ? '#e6a23c' : '#f56c6c'"
            :stroke-width="8"
            :show-text="false"
            style="width: 80px;"
          />
          <span :class="$style.summaryValue">{{ analysis.completeness.score }}%</span>
        </div>
      </div>

      <!-- 缺失信息 -->
      <div v-if="analysis.completeness.missing.length > 0" :class="$style.missingSection">
        <div :class="$style.missingTitle">
          <AppIcon name="warning" :size="14" />
          <span>缺失信息</span>
        </div>
        <ul :class="$style.missingList">
          <li v-for="(item, idx) in analysis.completeness.missing" :key="idx">
            {{ item }}
          </li>
        </ul>
      </div>

      <!-- 假设 -->
      <div v-if="analysis.completeness.assumptions.length > 0" :class="$style.assumptionsSection">
        <div :class="$style.assumptionsTitle">
          <AppIcon name="info-filled" :size="14" />
          <span>AI 假设</span>
        </div>
        <ul :class="$style.assumptionsList">
          <li v-for="(item, idx) in analysis.completeness.assumptions" :key="idx">
            {{ item }}
          </li>
        </ul>
      </div>
    </div>

    <!-- 建议的任务链 -->
    <div v-if="analysis.suggestedChain.length > 0" :class="$style.chainSection">
      <div :class="$style.chainTitle">
        <AppIcon name="list" :size="14" />
        <span>执行计划</span>
      </div>
      <div :class="$style.chainList">
        <div v-for="(step, idx) in analysis.suggestedChain" :key="idx" :class="$style.chainItem">
          <div :class="$style.chainStep">{{ idx + 1 }}</div>
          <div :class="$style.chainContent">
            <div :class="$style.chainAgent">{{ step.agent }}</div>
            <div :class="$style.chainDesc">{{ step.description }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 确认问题 -->
    <div v-if="analysis.confirmQuestions.length > 0" :class="$style.questionsSection">
      <div :class="$style.questionsTitle">
        <AppIcon name="question" :size="14" />
        <span>请确认以下信息</span>
      </div>

      <div :class="$style.questionsList">
        <div v-for="q in analysis.confirmQuestions" :key="q.id" :class="$style.questionItem">
          <div :class="$style.questionText">
            {{ q.question }}
            <span v-if="q.required" :class="$style.required">*</span>
          </div>

          <!-- 选项 -->
          <div v-if="q.options && q.options.length > 0" :class="$style.optionsList">
            <el-button
              v-for="opt in q.options"
              :key="opt"
              :type="answers[q.id] === opt ? 'primary' : 'default'"
              size="small"
              @click="selectOption(q.id, opt)"
            >
              {{ opt }}
            </el-button>
          </div>

          <!-- 自由输入 -->
          <el-input
            v-else
            v-model="answers[q.id]"
            :placeholder="q.question"
            size="small"
          />
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="waitingConfirmation" :class="$style.actions">
      <el-button @click="handleSkip" :disabled="!canConfirm">
        跳过，直接执行
      </el-button>
      <el-button type="primary" @click="handleConfirm" :disabled="!canConfirm">
        确认，开始执行
      </el-button>
    </div>
  </div>
</template>

<style module>
.card {
  background: var(--ai-bg-white, #FFFFFF);
  border: 1px solid var(--ai-border-light, #EBEDF3);
  border-radius: 12px;
  overflow: hidden;
}

/* Summary */
.summary {
  padding: 16px;
  border-bottom: 1px solid var(--ai-border-light, #EBEDF3);
}

.summaryHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--ai-text-primary, #333333);
  font-weight: 600;
}

.summaryTitle {
  font-size: 14px;
}

.summaryGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.summaryItem {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summaryLabel {
  font-size: 12px;
  color: var(--ai-text-hint, #999999);
  min-width: 40px;
}

.summaryValue {
  font-size: 12px;
  color: var(--ai-text-primary, #333333);
}

/* Missing */
.missingSection {
  margin-top: 12px;
  padding: 12px;
  background: var(--ai-color-warning-bg, #FDF6EC);
  border-radius: 8px;
}

.missingTitle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ai-color-warning, #E6A23C);
  margin-bottom: 8px;
}

.missingList {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--ai-text-secondary, #666666);
}

.missingList li {
  margin-bottom: 4px;
}

/* Assumptions */
.assumptionsSection {
  margin-top: 12px;
  padding: 12px;
  background: var(--ai-color-info-bg, #EEF5FF);
  border-radius: 8px;
}

.assumptionsTitle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ai-color-primary, #0060A2);
  margin-bottom: 8px;
}

.assumptionsList {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--ai-text-secondary, #666666);
}

.assumptionsList li {
  margin-bottom: 4px;
}

/* Chain */
.chainSection {
  padding: 16px;
  border-bottom: 1px solid var(--ai-border-light, #EBEDF3);
}

.chainTitle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ai-text-primary, #333333);
  margin-bottom: 12px;
}

.chainList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chainItem {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.chainStep {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--ai-color-primary, #0060A2);
  color: white;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chainContent {
  flex: 1;
}

.chainAgent {
  font-size: 12px;
  font-weight: 600;
  color: var(--ai-text-primary, #333333);
}

.chainDesc {
  font-size: 12px;
  color: var(--ai-text-secondary, #666666);
}

/* Questions */
.questionsSection {
  padding: 16px;
}

.questionsTitle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ai-text-primary, #333333);
  margin-bottom: 12px;
}

.questionsList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.questionItem {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.questionText {
  font-size: 13px;
  color: var(--ai-text-primary, #333333);
}

.required {
  color: var(--ai-color-danger, #F56C6C);
  margin-left: 2px;
}

.optionsList {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Actions */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--ai-border-light, #EBEDF3);
  background: var(--ai-bg-gray-light, #FAFAFA);
}
</style>
