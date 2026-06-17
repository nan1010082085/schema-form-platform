<script setup lang="ts">
/**
 * PropertyField -- 单个属性字段（动态组件渲染）
 *
 * 根据 type prop 渲染不同的 Element Plus 输入组件。
 * 所有输入事件统一通过 'update' emit 向上传递。
 */
import { ref, computed, watch, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import styles from './PropertyField.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

interface SelectOption {
  label: string
  value: string | number | boolean
}

interface RemoteOption {
  label: string
  value: string | number | boolean
}

const props = defineProps<{
  label: string
  type: string
  value: unknown
  desc?: string
  placeholder?: string
  options?: SelectOption[]
  remoteUrl?: string
  labelField?: string
  valueField?: string
}>()

const emit = defineEmits<{
  update: [value: unknown]
}>()

function handleUpdate(val: unknown) {
  emit('update', val)
}

// ---- Color Array ----

const DEFAULT_COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de']

const colorArrayValue = computed(() => {
  if (Array.isArray(props.value)) {
    return props.value as string[]
  }
  return DEFAULT_COLORS
})

function updateColorArray(index: number, color: string) {
  const arr = [...colorArrayValue.value]
  arr[index] = color
  emit('update', arr)
}

function addColorArrayItem() {
  const arr = [...colorArrayValue.value, '#000000']
  emit('update', arr)
}

function removeColorArrayItem(index: number) {
  const arr = colorArrayValue.value.filter((_, i) => i !== index)
  emit('update', arr)
}

// ---- Remote Select 状态 ----
const remoteOptions = ref<RemoteOption[]>([])
const remoteLoading = ref(false)

async function fetchRemoteOptions() {
  if (!props.remoteUrl) return
  remoteLoading.value = true
  try {
    const data = await apiClient.get<{ items: Record<string, unknown>[] }>(props.remoteUrl)
    const items = data?.items ?? []
    remoteOptions.value = items.map(item => ({
      label: String(item[props.labelField ?? 'name'] ?? ''),
      value: String(item[props.valueField ?? 'id'] ?? ''),
    }))
  } catch {
    remoteOptions.value = []
  } finally {
    remoteLoading.value = false
  }
}

onMounted(() => {
  if (props.type === 'remote-select') {
    fetchRemoteOptions()
  }
})

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
  <div :class="[styles.field, type === 'textarea' && styles.fieldTextarea]">
    <el-tooltip :content="desc || label" placement="top" :show-after="300">
      <label :class="styles.label">{{ label.length > 4 ? label.slice(0, 4) + '…' : label }}</label>
    </el-tooltip>
    <div :class="styles.control">
      <!-- 文本输入 -->
      <el-input
        v-if="type === 'text'"
        :model-value="String(value ?? '')"
        size="small"
        @update:model-value="handleUpdate"
      />

      <!-- 数字输入 -->
      <el-input-number
        v-else-if="type === 'number'"
        :model-value="(value as number) ?? 0"
        size="small"
        controls-position="right"
        @update:model-value="handleUpdate"
      />

      <!-- 布尔开关 -->
      <el-switch
        v-else-if="type === 'switch'"
        :model-value="Boolean(value ?? false)"
        @update:model-value="handleUpdate"
      />

      <!-- 颜色选择 -->
      <el-color-picker
        v-else-if="type === 'color'"
        :model-value="String(value ?? '')"
        size="small"
        show-alpha
        @update:model-value="handleUpdate"
      />

      <!-- 下拉选择 -->
      <el-select
        v-else-if="type === 'select'"
        :model-value="String(value ?? '')"
        size="small"
        style="width: 100%"
        @update:model-value="handleUpdate"
      >
        <el-option
          v-for="opt in (props.options ?? [])"
          :key="String(opt.value)"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>

      <!-- 远程下拉选择 -->
      <el-select
        v-else-if="type === 'remote-select'"
        :model-value="String(value ?? '')"
        :loading="remoteLoading"
        :placeholder="props.placeholder || '请选择'"
        size="small"
        style="width: 100%"
        filterable
        clearable
        @update:model-value="handleUpdate"
      >
        <el-option
          v-for="opt in remoteOptions"
          :key="String(opt.value)"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>

      <!-- JSON 编辑器 -->
      <div v-else-if="type === 'json'" :class="styles.jsonWrap">
        <el-input
          v-model="jsonText"
          type="textarea"
          :rows="6"
          placeholder="输入 JSON 数据"
          :class="[styles.jsonInput, jsonError ? styles.jsonInputError : '']"
          @focus="onJsonFocus"
          @blur="onJsonBlur"
        />
        <span v-if="jsonError" :class="styles.jsonError">{{ jsonError }}</span>
      </div>

      <!-- 颜色数组 -->
      <div v-else-if="type === 'color-array'" :class="styles.colorArrayWrap">
        <div :class="styles.colorArrayItems">
          <div
            v-for="(color, idx) in colorArrayValue"
            :key="idx"
            :class="styles.colorArrayItem"
          >
            <el-color-picker
              :model-value="color"
              size="small"
              @update:model-value="(val: string) => updateColorArray(idx, val)"
            />
          </div>
        </div>
        <div :class="styles.colorArrayActions">
          <el-button
            :class="styles.colorArrayActionBtn"
            type="primary"
            text
            size="small"
            @click="addColorArrayItem"
          >
            <AppIcon name="plus" :size="14" />
          </el-button>
          <el-button
            v-if="colorArrayValue.length > 1"
            :class="styles.colorArrayActionBtn"
            type="danger"
            text
            size="small"
            @click="removeColorArrayItem(colorArrayValue.length - 1)"
          >
            <AppIcon name="delete" :size="14" />
          </el-button>
        </div>
      </div>

      <!-- 兜底：文本输入 -->
      <el-input
        v-else
        :model-value="String(value ?? '')"
        size="small"
        @update:model-value="handleUpdate"
      />
    </div>
  </div>
</template>
