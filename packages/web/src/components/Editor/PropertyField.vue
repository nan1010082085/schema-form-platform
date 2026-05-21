<script setup lang="ts">
/**
 * PropertyField -- 单个属性字段（动态组件渲染）
 *
 * 根据 type prop 渲染不同的 Element Plus 输入组件。
 * 所有输入事件统一通过 'update' emit 向上传递。
 */
import { ElInput, ElInputNumber, ElSwitch, ElSelect, ElOption, ElColorPicker, ElTooltip } from 'element-plus'

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
</script>

<template>
  <div :class="$style.field">
    <ElTooltip :content="desc || label" placement="top" :disabled="!desc && label.length <= 4" :show-after="500">
      <label :class="$style.label">{{ label.length > 4 ? label.slice(0, 4) + '…' : label }}</label>
    </ElTooltip>
    <div :class="$style.control">
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

<style module>
.field {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  min-height: 32px;
}

.label {
  width: 70px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 32px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control {
  flex: 1;
  min-width: 0;
  height: 32px;
  display: flex;
  align-items: center;
}

</style>
