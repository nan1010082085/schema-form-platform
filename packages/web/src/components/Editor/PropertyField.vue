<script setup lang="ts">
/**
 * PropertyField -- 单个属性字段（动态组件渲染）
 *
 * 根据 type prop 渲染不同的 Element Plus 输入组件。
 * 所有输入事件统一通过 'update' emit 向上传递。
 */
import { ref, watch } from 'vue'
import { ElInput, ElInputNumber, ElSwitch, ElSelect, ElOption, ElColorPicker, ElTooltip } from 'element-plus'

interface SelectOption {
  label: string
  value: string | number | boolean
}

interface DictItem {
  label: string
  value: string | number
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

// ---- 选项数组编辑 ----
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
  <div :class="$style.field">
    <ElTooltip :content="desc || label" placement="top" :disabled="!desc && label.length <= 4">
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

      <!-- 选项数组编辑（DictItem[]） -->
      <div v-else-if="type === 'options'" :class="$style.optionsEditor">
        <div
          v-for="(opt, i) in localOptions"
          :key="i"
          :class="$style.optionRow"
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
          <button :class="$style.optionRemove" @click="removeOption(i)">×</button>
        </div>
        <button :class="$style.optionAdd" @click="addOption">+ 添加选项</button>
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

.optionsEditor {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.optionRow {
  display: flex;
  gap: 4px;
  align-items: center;
}

.optionRemove {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #f56c6c;
  cursor: pointer;
  font-size: 16px;
  flex-shrink: 0;
  border-radius: 4px;

  &:hover { background: #fef0f0; }
}

.optionAdd {
  border: 1px dashed #dcdfe6;
  background: transparent;
  color: #909399;
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  text-align: center;

  &:hover { border-color: #409eff; color: #409eff; }
}
</style>
