<script setup lang="ts">
import type { TaskChainStep } from '@/types'

defineProps<{
  steps: TaskChainStep[]
  currentIndex: number
}>()

function getStepIcon(status: TaskChainStep['status']): string {
  switch (status) {
    case 'done': return '✓'
    case 'running': return '●'
    case 'skipped': return '○'
    default: return '○'
  }
}

function getAgentLabel(agent: 'editor' | 'flow'): string {
  return agent === 'editor' ? '表单' : '流程'
}
</script>

<template>
  <div :class="$style.bar">
    <div :class="$style.label">任务链</div>
    <div :class="$style.steps">
      <template v-for="(step, idx) in steps" :key="idx">
        <div
          :class="[
            $style.step,
            $style[step.status],
            idx === currentIndex ? $style.current : '',
          ]"
        >
          <span :class="$style.stepIcon">{{ getStepIcon(step.status) }}</span>
          <span :class="$style.stepAgent">{{ getAgentLabel(step.agent) }}</span>
          <span :class="$style.stepDesc">{{ step.description }}</span>
        </div>
        <div v-if="idx < steps.length - 1" :class="$style.arrow">→</div>
      </template>
    </div>
  </div>
</template>

<style module src="./TaskChainBar.module.css" />
