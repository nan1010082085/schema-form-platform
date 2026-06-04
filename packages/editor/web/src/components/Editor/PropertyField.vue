<script setup lang="ts">
/**
 * PropertyField -- 单个属性字段（动态组件渲染）
 *
 * 根据 type prop 渲染不同的 Element Plus 输入组件。
 * 所有输入事件统一通过 'update' emit 向上传递。
 */
import { ref, watch } from 'vue'
import { ElInput, ElInputNumber, ElSwitch, ElSelect, ElOption, ElColorPicker, ElTooltip } from 'element-plus'
import styles from './PropertyField.module.scss'

interface SelectOption {
  label: string
  value: string | number | boolean
}

const props = defineProps<{
  label: string
  type: string
  value: unknown
  desc?: string
  options?: SelectOption[]
}>()

const emit = defineEmits<{
  update: [value: unknown]
}>()

function handleUpdate(val: unknown) {
  emit('update', val)
}

// ---- JSON 编辑器状态 ----

const jsonText = ref('')
const jsonError = ref('')

function formatJsonValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  return JSON.stringify(val, null, 2)
}

// 初始化 & 同步外部值变化
watch(() => props.value, (val) => {
  if (props.type === 'json') {
    jsonText.value = formatJsonValue(val)
    jsonError.value = ''
  }
}, { immediate: true })

function onJsonFocus() {
  jsonError.value = ''
}

function onJsonBlur() {
  const text = jsonText.value.trim()
  if (!text) {
    emit('update', null)
    jsonError.value = ''
    return
  }
  try {
    const parsed = JSON.parse(text)
    emit('update', parsed)
    jsonError.value = ''
  } catch {
    jsonError.value = 'JSON 格式不正确'
  }
}
</script>

<template>
  <div :class="styles.field">
    <ElTooltip :content="desc || label" placement="top" :disabled="!desc && label.length <= 4" :show-after="500">
      <label :class="styles.label">{{ label.length > 4 ? label.slice(0, 4) + '…' : label }}</label>
    </ElTooltip>
    <div :class="styles.control">
      <!-- 文本输入 -->
      <ElInput
        v-if="type === 'text'"
        :model-value="String(value ?? '')"
        size="small"
        @update:model-value="handleUpdate"
      />

      <!-- 数字输入 -->
      <ElInputNumber
        v-else-if="type === 'number'"
        :model-value="(value as number) ?? 0"
        size="small"
        controls-position="right"
        @update:model-value="handleUpdate"
      />

      <!-- 布尔开关 -->
      <ElSwitch
        v-else-if="type === 'switch'"
        :model-value="Boolean(value ?? false)"
        @update:model-value="handleUpdate"
      />

      <!-- 颜色选择 -->
      <ElColorPicker
        v-else-if="type === 'color'"
        :model-value="String(value ?? '')"
        size="small"
        show-alpha
        @update:model-value="handleUpdate"
      />

      <!-- 下拉选择 -->
      <ElSelect
        v-else-if="type === 'select'"
        :model-value="String(value ?? '')"
        size="small"
        style="width: 100%"
        @update:model-value="handleUpdate"
      >
        <ElOption
          v-for="opt in (props.options ?? [])"
          :key="String(opt.value)"
          :label="opt.label"
          :value="opt.value"
        />
      </ElSelect>

      <!-- JSON 编辑器 -->
      <div v-else-if="type === 'json'" :class="styles.jsonWrap">
        <ElInput
          v-model="jsonText"
          type="textarea"
          :rows="6"
          size="small"
          placeholder="输入 JSON 数据"
          :class="[styles.jsonInput, jsonError ? styles.jsonInputError : '']"
          @focus="onJsonFocus"
          @blur="onJsonBlur"
        />
        <span v-if="jsonError" :class="styles.jsonError">{{ jsonError }}</span>
      </div>

      <!-- 兜底：文本输入 -->
      <ElInput
        v-else
        :model-value="String(value ?? '')"
        size="small"
        @update:model-value="handleUpdate"
      />
    </div>
  </div>
</template>

