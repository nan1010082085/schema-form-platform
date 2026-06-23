<script setup lang="ts">
/**
 * NumberArrayEditor -- 编辑 number[] 类型的属性
 *
 * 用于布局容器的 colWidths 配置，如 [50, 50] 或 [33, 34, 33]
 * 支持增减列、拖动排序、数值输入
 */
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

const props = defineProps<{
  value: number[]
  label?: string
  min?: number
  max?: number
}>()

const emit = defineEmits<{
  update: [value: number[]]
}>()

function addColumn() {
  const count = props.value.length + 1
  const even = Math.floor(100 / count)
  const remainder = 100 - even * (count - 1)
  const widths = Array.from({ length: count - 1 }, () => even)
  widths.push(remainder)
  emit('update', widths)
}

function removeColumn(index: number) {
  if (props.value.length <= 1) return
  const remaining = props.value.filter((_, i) => i !== index)
  const total = remaining.reduce((a, b) => a + b, 0)
  if (total === 0) {
    const even = Math.floor(100 / remaining.length)
    emit('update', remaining.map((_, i) => i === remaining.length - 1 ? 100 - even * (remaining.length - 1) : even))
  } else {
    emit('update', remaining)
  }
}

function updateWidth(index: number, value: number) {
  const updated = [...props.value]
  updated[index] = value ?? 0
  emit('update', updated)
}

function moveUp(index: number) {
  if (index === 0) return
  const updated = [...props.value]
  ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
  emit('update', updated)
}

function moveDown(index: number) {
  if (index >= props.value.length - 1) return
  const updated = [...props.value]
  ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
  emit('update', updated)
}
</script>

<template>
  <div class="number-array-editor">
    <div
      v-for="(w, idx) in value"
      :key="idx"
      class="number-array-editor__item"
    >
      <span class="number-array-editor__item-label">列 {{ idx + 1 }}</span>
      <el-input-number
        :model-value="w"
        :min="min ?? 0"
        :max="max ?? 100"
        size="small"
        controls-position="right"
        style="flex: 1"
        @update:model-value="(v: number) => updateWidth(idx, v)"
      />
      <div class="number-array-editor__item-actions">
        <el-button size="small" text :disabled="idx === 0" @click="moveUp(idx)">
          <AppIcon name="arrow-up" />
        </el-button>
        <el-button size="small" text :disabled="idx === value.length - 1" @click="moveDown(idx)">
          <AppIcon name="arrow-down" />
        </el-button>
        <el-button size="small" text type="danger" :disabled="value.length <= 1" @click="removeColumn(idx)">
          <AppIcon name="delete" />
        </el-button>
      </div>
    </div>
    <el-button
      type="primary"
      size="small"
      plain
      style="width: 100%; margin-top: 6px"
      @click="addColumn"
    >
      <AppIcon name="plus" /> 添加列
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.number-array-editor {
  &__item {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }

  &__item-label {
    font-size: 11px;
    color: #606266;
    white-space: nowrap;
    min-width: 36px;
  }

  &__item-actions {
    display: flex;
    align-items: center;
    gap: 0;
  }
}
</style>
