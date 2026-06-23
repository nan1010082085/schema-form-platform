<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'
import styles from './TimerEventPanel.module.scss'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const timerType = computed(() => (props.node.data?.timerType as string) ?? 'duration')

const timerPlaceholder = computed(() => {
  switch (timerType.value) {
    case 'date': return '2026-06-01T09:00:00Z'
    case 'cycle': return 'R3/PT1H'
    default: return 'PT2H'
  }
})

const timerHint = computed(() => {
  switch (timerType.value) {
    case 'date': return 'ISO 8601 日期时间'
    case 'cycle': return 'ISO 8601 循环，R3/PT1H（每小时重复3次）'
    default: return 'ISO 8601 持续时间，如 PT2H（2小时）、P3D（3天）'
  }
})
</script>

<template>
  <SectionToggle title="节点配置" :count="2">
    <FieldRow label="定时类型">
      <el-radio-group
        :model-value="timerType"

        @change="update('timerType', $event)"
      >
        <el-radio value="duration">持续时间</el-radio>
        <el-radio value="date">指定日期</el-radio>
        <el-radio value="cycle">循环</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow label="定时值">
      <el-input
        :model-value="(node.data?.timerValue as string) ?? ''"
        :placeholder="timerPlaceholder"

        @input="update('timerValue', $event)"
      />
    </FieldRow>

    <div :class="styles.hint">{{ timerHint }}</div>
  </SectionToggle>
</template>
