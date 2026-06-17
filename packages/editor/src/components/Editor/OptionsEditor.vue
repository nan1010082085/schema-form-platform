<script setup lang="ts">
/**
 * OptionsEditor -- 选项列表编辑器（独立行组件）
 *
 * 用于 select/radio/checkbox 等组件的选项配置。
 * 每个选项包含 label + value，支持增删。
 */
import { ref, watch } from 'vue'
import styles from './OptionsEditor.module.scss'

interface DictItem {
  label: string
  value: string | number
}

const props = defineProps<{
  label: string
  value: unknown
}>()

const emit = defineEmits<{
  update: [value: DictItem[]]
}>()

const localOptions = ref<DictItem[]>([])

watch(() => props.value, (v) => {
  if (Array.isArray(v)) {
    localOptions.value = v.map((item) => ({
      label: String(item?.label ?? ''),
      value: item?.value ?? '',
    }))
  }
}, { immediate: true })

function addOption() {
  localOptions.value.push({ label: '', value: '' })
  emit('update', [...localOptions.value])
}

function removeOption(index: number) {
  localOptions.value.splice(index, 1)
  emit('update', [...localOptions.value])
}

function updateOptionLabel(index: number, label: string) {
  localOptions.value[index].label = label
  emit('update', [...localOptions.value])
}

function updateOptionValue(index: number, value: string) {
  localOptions.value[index].value = value
  emit('update', [...localOptions.value])
}
</script>

<template>
  <div :class="styles.container">
    <div :class="styles.label">{{ label }}</div>
    <div :class="styles.list">
      <div
        v-for="(opt, i) in localOptions"
        :key="i"
        :class="styles.row"
      >
        <el-input
          :model-value="opt.label"
          placeholder="显示文本"
          size="small"
          @update:model-value="(v: string) => updateOptionLabel(i, v)"
        />
        <el-input
          :model-value="String(opt.value)"
          placeholder="值"
          size="small"
          @update:model-value="(v: string) => updateOptionValue(i, v)"
        />
        <button :class="styles.remove" @click="removeOption(i)">&times;</button>
      </div>
      <button :class="styles.add" @click="addOption">+ 添加选项</button>
    </div>
  </div>
</template>
