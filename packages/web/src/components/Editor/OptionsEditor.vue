<script setup lang="ts">
/**
 * OptionsEditor -- 选项列表编辑器（独立行组件）
 *
 * 用于 select/radio/checkbox 等组件的选项配置。
 * 每个选项包含 label + value，支持增删。
 */
import { ref, watch } from 'vue'
import { ElInput } from 'element-plus'

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
  <div :class="$style.container">
    <div :class="$style.label">{{ label }}</div>
    <div :class="$style.list">
      <div
        v-for="(opt, i) in localOptions"
        :key="i"
        :class="$style.row"
      >
        <ElInput
          :model-value="opt.label"
          placeholder="显示文本"
          size="small"
          @update:model-value="(v: string) => updateOptionLabel(i, v)"
        />
        <ElInput
          :model-value="String(opt.value)"
          placeholder="值"
          size="small"
          @update:model-value="(v: string) => updateOptionValue(i, v)"
        />
        <button :class="$style.remove" @click="removeOption(i)">&times;</button>
      </div>
      <button :class="$style.add" @click="addOption">+ 添加选项</button>
    </div>
  </div>
</template>

<style module>
.container {
  margin-bottom: 8px;
}

.label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
  font-weight: 500;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.remove {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #f56c6c;
  cursor: pointer;
  font-size: 16px;
  flex-shrink: 0;
  border-radius: 4px;
}

.remove:hover {
  background: #fef0f0;
}

.add {
  border: 1px dashed #dcdfe6;
  background: transparent;
  color: #909399;
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  text-align: center;
}

.add:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}
</style>
